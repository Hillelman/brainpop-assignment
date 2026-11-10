import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RiskBadge from '@/components/items/RiskBadge.vue'
import StatusBadge from '@/components/items/StatusBadge.vue'
import type { ItemStatus, RiskLevel } from '@/types/api'

describe('StatusBadge', () => {
  it.each<[ItemStatus, string]>([
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
  ])('renders %s', (status, label) => {
    expect(mount(StatusBadge, { props: { status } }).text()).toBe(label)
  })
})

describe('RiskBadge', () => {
  it.each<[RiskLevel | null, string]>([
    ['low', 'Low'],
    ['medium', 'Medium'],
    ['high', 'High'],
    [null, '—'],
  ])('renders %s', (risk, label) => {
    expect(mount(RiskBadge, { props: { risk } }).text()).toBe(label)
  })
})
