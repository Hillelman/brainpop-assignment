<?php

namespace App\Storage;

use App\Exceptions\StorageCorruptedException;
use Illuminate\Support\Facades\Log;
use JsonException;
use RuntimeException;

/**
 * Concurrency-safe JSON-file storage. Each collection lives in `<path>/<collection>.json`
 * as a list of records with integer ids.
 *
 * Reads are cached per instance (bind it as a request-scoped singleton). Writes go through
 * {@see self::transaction()}: an exclusive lock on a sidecar `.lock` file (the data file itself
 * is replaced by rename, so it cannot carry the lock), a fresh read, then a temp-file + rename.
 */
class JsonStore
{
    /** @var array<string, list<array<string, mixed>>> */
    private array $cache = [];

    /** @var array<string, CollectionTransaction> */
    private array $active = [];

    public function __construct(private readonly string $path) {}

    /**
     * @return list<array<string, mixed>>
     *
     * @throws StorageCorruptedException
     */
    public function read(string $collection): array
    {
        if (isset($this->active[$collection])) {
            return $this->active[$collection]->records();
        }

        return $this->cache[$collection] ??= $this->load($collection);
    }

    /**
     * Runs the mutator under an exclusive lock on fresh data and persists the result atomically.
     * Nested calls for the same collection join the outer transaction.
     *
     * @template T
     *
     * @param  callable(CollectionTransaction): T  $mutator
     * @return T
     *
     * @throws StorageCorruptedException
     */
    public function transaction(string $collection, callable $mutator): mixed
    {
        if (isset($this->active[$collection])) {
            return $mutator($this->active[$collection]);
        }

        $this->ensureDirectory();
        $lock = fopen($this->lockPath($collection), 'c');
        if ($lock === false) {
            throw new RuntimeException("Unable to open lock file for collection [{$collection}].");
        }

        try {
            if (! flock($lock, LOCK_EX)) {
                throw new RuntimeException("Unable to lock collection [{$collection}].");
            }

            $transaction = new CollectionTransaction($this->load($collection));
            $this->active[$collection] = $transaction;

            try {
                $result = $mutator($transaction);
                $this->write($collection, $transaction->records());
            } finally {
                unset($this->active[$collection]);
            }

            $this->cache[$collection] = $transaction->records();

            return $result;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function load(string $collection): array
    {
        $file = $this->filePath($collection);
        if (! is_file($file)) {
            return [];
        }

        $contents = file_get_contents($file);
        if ($contents === false) {
            throw new RuntimeException("Unable to read [{$file}].");
        }
        if (trim($contents) === '') {
            return [];
        }

        try {
            $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            Log::error('Corrupted JSON storage file.', ['file' => $file, 'error' => $e->getMessage()]);

            throw StorageCorruptedException::forFile($file, $e);
        }

        if (! is_array($data) || ! array_is_list($data)) {
            Log::error('Unexpected JSON storage structure.', ['file' => $file]);

            throw StorageCorruptedException::forFile($file);
        }

        return $data;
    }

    /**
     * @param  list<array<string, mixed>>  $records
     */
    private function write(string $collection, array $records): void
    {
        $file = $this->filePath($collection);
        $temp = tempnam($this->path, $collection.'.tmp.');
        if ($temp === false) {
            throw new RuntimeException("Unable to create temp file for [{$file}].");
        }

        try {
            $json = json_encode($records, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (file_put_contents($temp, $json, LOCK_EX) === false) {
                throw new RuntimeException("Unable to write temp file for [{$file}].");
            }
            chmod($temp, 0644);
            if (! rename($temp, $file)) {
                throw new RuntimeException("Unable to replace [{$file}].");
            }
        } catch (\Throwable $e) {
            if (is_file($temp)) {
                unlink($temp);
            }

            throw $e;
        }
    }

    private function ensureDirectory(): void
    {
        if (! is_dir($this->path) && ! mkdir($this->path, 0755, true) && ! is_dir($this->path)) {
            throw new RuntimeException("Unable to create storage directory [{$this->path}].");
        }
    }

    private function filePath(string $collection): string
    {
        return $this->path.DIRECTORY_SEPARATOR.$collection.'.json';
    }

    private function lockPath(string $collection): string
    {
        return $this->path.DIRECTORY_SEPARATOR.$collection.'.lock';
    }
}
