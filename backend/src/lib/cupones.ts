export interface Cupon {
  codigo: string;
  tipo: 'porcentaje' | 'trial';
  valor: number;
  dias?: number;
  planTrial?: string;
  activo: boolean;
  descripcion: string;
}

export const CUPONES: Record<string, Cupon> = {
  BIENVENIDA: {
    codigo: 'BIENVENIDA',
    tipo: 'trial',
    valor: 100,
    dias: 30,
    planTrial: 'profesional',
    activo: true,
    descripcion: '30 dias gratis en plan Profesional',
  },
  LANZAMIENTO20: {
    codigo: 'LANZAMIENTO20',
    tipo: 'porcentaje',
    valor: 20,
    activo: true,
    descripcion: '20% de descuento en el primer pago',
  },
};

export function buscarCupon(codigo?: string | null): Cupon | null {
  if (!codigo) return null;
  const c = CUPONES[String(codigo).trim().toUpperCase()];
  return c && c.activo ? c : null;
}
