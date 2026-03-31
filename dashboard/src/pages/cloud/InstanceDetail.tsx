import { useParams, useNavigate } from 'react-router-dom'
import { useInstancesStore } from '../../store/instances'
import { useInstance } from '../../hooks/useInstance'
import { InstanceProvider } from '../../contexts/InstanceContext'
import TopBar from '../../components/TopBar'
import Button from '../../components/Button'
import { Outlet } from 'react-router-dom'

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const instance = useInstancesStore(s => s.instances.find(i => i.id === id))

  if (!instance) {
    return (
      <>
        <TopBar title="Instance Not Found" />
        <main className="p-4 lg:p-6">
          <p className="text-[var(--text-secondary)]">This instance doesn't exist.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/instances')}>
            Back to Instances
          </Button>
        </main>
      </>
    )
  }

  return <InstanceDetailInner key={instance.id} instance={instance} />
}

function InstanceDetailInner({ instance }: { instance: NonNullable<ReturnType<typeof useInstancesStore.getState>['instances'][number]> }) {
  const { api } = useInstance(instance.url, instance.api_key)

  return (
    <InstanceProvider api={api} instanceName={instance.name}>
      <Outlet />
    </InstanceProvider>
  )
}
