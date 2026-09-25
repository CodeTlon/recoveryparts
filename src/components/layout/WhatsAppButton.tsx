import { demoConfig } from '@/lib/demo-config'
import { WhatsAppIcon } from './SocialIcons'

export default function WhatsAppButton() {
  const { business } = demoConfig

  return (
    <a
      href={`https://wa.me/${business.whatsapp}?text=Hola! Quiero consultar por un turno.`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 text-white"
      style={{ backgroundColor: '#25D366' }}
    >
      <WhatsAppIcon size={30} />
    </a>
  )
}
