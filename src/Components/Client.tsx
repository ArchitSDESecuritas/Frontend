import { Navigate } from 'react-router-dom'

export * from './pdf-utils'

export default function Client() {
  return <Navigate to="/ClientRequest" replace />
}
