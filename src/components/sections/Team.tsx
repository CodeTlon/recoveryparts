import Image from 'next/image'
import { Instagram } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

export default function Team() {
  const { content } = demoConfig

  return (
    <section id="team" className="section-pad" style={{ backgroundColor: 'var(--demo-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Las personas detrás</p>
          <h2 className="section-title">Nuestro equipo</h2>
          <p className="section-subtitle mt-4">
            Profesionales apasionados listos para transformar tu look.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {content.team.map((member) => (
            <div key={member.name} className="text-center group">
              <div className="relative w-48 h-48 rounded-full overflow-hidden mx-auto mb-6">
                {member.photo ? (
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized={member.photo.startsWith('http')}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-4xl font-bold"
                    style={{ backgroundColor: 'var(--demo-surface)', color: 'var(--demo-accent)' }}
                  >
                    {member.name[0]}
                  </div>
                )}
                {/* Ring decorativo */}
                <div
                  className="absolute inset-0 rounded-full border-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ borderColor: 'var(--demo-accent)' }}
                />
              </div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--demo-heading)' }}>{member.name}</h3>
              <p className="text-sm mb-3" style={{ color: 'var(--demo-muted)' }}>{member.role}</p>
              {member.instagram && (
                <a
                  href={`https://instagram.com/${member.instagram.replace('@', '')}`}
                  className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--demo-accent)' }}
                >
                  <Instagram size={14} />
                  {member.instagram}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
