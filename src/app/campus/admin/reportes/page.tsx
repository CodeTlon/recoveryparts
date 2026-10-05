import { redirect } from 'next/navigation'

// Reportes se fusionó con el Resumen (/campus/admin).
export default function Reportes() {
  redirect('/campus/admin')
}
