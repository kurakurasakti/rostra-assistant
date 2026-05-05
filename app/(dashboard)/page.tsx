import { Users, ShoppingBag, CreditCard, MessageSquare, ArrowRight, Clock } from 'lucide-react'

const stats = [
  {
    label: 'Total Klien',
    value: '0',
    icon: Users,
    description: 'Belum ada klien',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Pesanan Aktif',
    value: '0',
    icon: ShoppingBag,
    description: 'Belum ada pesanan',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    label: 'Menunggu Bayar',
    value: 'Rp 0',
    icon: CreditCard,
    description: 'Semua pembayaran lunas',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Pesan Masuk',
    value: '0',
    icon: MessageSquare,
    description: 'Inbox kosong',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
]

const gettingStarted = [
  { step: '01', title: 'Lengkapi profil bisnis', desc: 'Tambahkan nama bisnis dan koneksi WhatsApp', href: '/settings' },
  { step: '02', title: 'Tambah klien pertama', desc: 'Mulai kelola daftar klien kamu', href: '/clients' },
  { step: '03', title: 'Buat pesanan', desc: 'Catat pesanan dan atur tahap pembayaran', href: '/clients' },
]

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Selamat datang di Rostra. Pantau bisnis kamu dari sini.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, description, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <div>
              <p className="font-display font-bold text-2xl tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Getting started */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Mulai dengan Rostra</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">3 langkah</span>
          </div>
          <div className="space-y-3">
            {gettingStarted.map(({ step, title, desc, href }) => (
              <a
                key={step}
                href={href}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <span className="font-display font-bold text-xs text-primary bg-primary/10 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Perlu Perhatian</h2>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Tidak ada yang perlu diperhatikan</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pembayaran jatuh tempo dan janji temu akan muncul di sini
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
