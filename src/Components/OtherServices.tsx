import { useEffect } from 'react'

const OTHER_SERVICES_URL = 'https://www.securitas.in/services/background-verification/'

function OtherServices() {
  useEffect(() => {
    window.location.assign(OTHER_SERVICES_URL)
  }, [])

  return <section className="dashboard-page-card"><span className="form-kicker">Securitas services</span><h1>Other Services</h1><p>Redirecting you to Securitas background verification services.</p><a className="hero-button policy-button" href={OTHER_SERVICES_URL}>Continue to services</a></section>
}

export default OtherServices
