const request = async (path, options = {}) => {
  const isForm = options.body instanceof FormData
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Request failed')
  }
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
}
