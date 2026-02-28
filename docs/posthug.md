Integrate PostHog with React Read the docs Automated installation AI setup wizard Try using the AI setup wizard to automatically install PostHog.

Run the following command from the root of your React project.

npx -y @posthog/wizard@latest OR Manual installation

1. Install the package required Install posthog-js and @posthog/react using your package manager:

npm yarn pnpm npm install posthog-js @posthog/react 2. Add environment variables required Add your PostHog API key and host to your environment variables. For Vite-based React apps, use the VITE*PUBLIC* prefix:

VITE_PUBLIC_POSTHOG_KEY=phc_cDJCC3Qom6hSPBeqDsyf0GwSuMkUbVpIrqERnDMz7hp VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com 3. Initialize PostHog required Wrap your app with the PostHogProvider com'ponent at the root of your application (such as main.tsx if you're using Vite):

import { StrictMode } from 'react' import { createRoot } from 'react-dom/client' import './index.css' import App from './App.jsx' import { PostHogProvider } from '@posthog/react'

const options = { api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST, defaults: '2026-01-30', } as const

createRoot(document.getElementById('root')).render( <StrictMode> <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}> <App /> </PostHogProvider> </StrictMode> ) defaults option The defaults option automatically configures PostHog with recommended settings for new projects. See SDK defaults for details.

4. Accessing PostHog in your code recommended Use the usePostHog hook to access the PostHog instance in any component wrapped by PostHogProvider:

import { usePostHog } from '@posthog/react'

function MyComponent() { const posthog = usePostHog()

    function handleClick() {
        posthog.capture('button_clicked', { button_name: 'signup' })
    }

    return <button onClick={handleClick}>Sign up</button>

} You can also import posthog directly for non-React code or utility functions:

import posthog from 'posthog-js'

export function trackPurchase(amount: number) { posthog.capture('purchase_completed', { amount }) } 5. Send events recommended Click around and view a couple pages to generate some events. PostHog automatically captures pageviews, clicks, and other interactions for you.

If you'd like, you can also manually capture custom events:

posthog.capture('my_custom_event', { property: 'value' })
