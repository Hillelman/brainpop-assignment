import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MobileSortMenu from '@/components/queue/MobileSortMenu.vue'
import type { SortMeta } from '@/types/api'

const sorts: SortMeta[] = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'risk', label: 'Risk' },
  { key: 'submitter', label: 'Submitter' },
  { key: 'created_at', label: 'Created' },
]

const passthrough = { template: '<div><slot /></div>' }

function mountMenu(sort: string, available: SortMeta[] = sorts) {
  return mount(MobileSortMenu, {
    props: { sorts: available, sort },
    global: {
      stubs: {
        DropdownMenu: passthrough,
        DropdownMenuTrigger: passthrough,
        DropdownMenuContent: passthrough,
        DropdownMenuItem: {
          emits: ['select'],
          template: '<button role="menuitem" @click="$emit(\'select\')"><slot /></button>',
        },
      },
    },
  })
}

describe('MobileSortMenu', () => {
  it('is hidden on md and up and labelled for assistive tech', () => {
    const trigger = mountMenu('').get('[aria-label="Sort items"]')
    expect(trigger.classes()).toContain('md:hidden')
    expect(trigger.text()).toContain('Sort: Created')
  })

  it('lists the sortable columns', () => {
    const items = mountMenu('').findAll('[role="menuitem"]')
    expect(items.map((i) => i.text())).toEqual(['Title', 'Status', 'Risk', 'Submitter', 'Created'])
  })

  it('lists only columns present in sorts and renders nothing without any', () => {
    const some = mountMenu(
      '',
      sorts.filter((s) => s.key !== 'status'),
    )
    expect(some.findAll('[role="menuitem"]').map((i) => i.text())).not.toContain('Status')
    expect(mountMenu('', []).find('[aria-label="Sort items"]').exists()).toBe(false)
  })

  it('toggles the direction when the active column is picked', async () => {
    const wrapper = mountMenu('')
    const created = wrapper.findAll('[role="menuitem"]')[4]
    await created.trigger('click')
    expect(wrapper.emitted('update')?.[0]).toEqual(['created_at'])
  })

  it('sorts ascending when an inactive column is picked', async () => {
    const wrapper = mountMenu('-created_at')
    await wrapper.findAll('[role="menuitem"]')[0].trigger('click')
    expect(wrapper.emitted('update')?.[0]).toEqual(['title'])
  })
})
