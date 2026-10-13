import { requireRole } from '@/lib/auth'
import MiCuenta from '@/components/campus/MiCuenta'

// Una ruta por rol: el middleware solo deja pasar /campus/<rol>/…
export default async function Cuenta() {
  const { sb, perfil } = await requireRole('profesor')
  return <MiCuenta sb={sb} userId={perfil.id} />
}
