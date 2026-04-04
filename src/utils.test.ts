import { describe, it, expect } from 'vitest'
import { esc } from './utils'

describe('esc', () => {
  it('escapes angle brackets', () => {
    expect(esc('<script>')).toContain('&lt;')
    expect(esc('<script>')).toContain('&gt;')
  })
  it('escapes ampersand', () => {
    expect(esc('a&b')).toContain('&amp;')
  })
  it('passes through normal text', () => {
    expect(esc('hello')).toBe('hello')
  })
})
