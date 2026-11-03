// Centro de servicio de USCIS inferido por las 3 letras del recibo. Se usa en la web, la API y el MCP.
export const CENTERS: Record<string, { es: string; en: string }> = {
  SRC: { es: 'Centro de Texas', en: 'Texas Service Center' },
  LIN: { es: 'Centro de Nebraska', en: 'Nebraska Service Center' },
  WAC: { es: 'Centro de California', en: 'California Service Center' },
  EAC: { es: 'Centro de Vermont', en: 'Vermont Service Center' },
  MSC: { es: 'Centro Nacional de Beneficios', en: 'National Benefits Center' },
  NBC: { es: 'Centro Nacional de Beneficios', en: 'National Benefits Center' },
  IOE: { es: 'Sistema en línea (ELIS)', en: 'Online system (ELIS)' },
  YSC: { es: 'Centro de Potomac', en: 'Potomac Service Center' },
};

export const RECEIPT_RE = /^[A-Z]{3}[0-9]{10}$/;
export const cleanReceipt = (raw: string) => String(raw ?? '').replace(/[\s-]/g, '').toUpperCase();
