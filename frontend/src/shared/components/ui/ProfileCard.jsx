import Avatar from '@/shared/components/ui/Avatar'

export default function ProfileCard({ admin }) {
    const names = admin?.name?.split(' ') || ['Admin']
    const firstName = names[0]
    const lastName = names[1] || ''

    return (
        <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg">
                <Avatar
                    size="sm"
                    firstName={firstName}
                    lastName={lastName}
                />
            </div>

            <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-app">
                    {admin?.name || 'Admin User'}
                </h4>

                <p className="truncate text-xs text-muted">
                    {admin?.email || 'admin@example.com'}
                </p>
            </div>
        </div>
    )
}
