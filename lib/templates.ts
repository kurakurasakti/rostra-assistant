export function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

export function formatRupiahInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(Number(digits))
}
