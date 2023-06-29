import {
  isRouteErrorResponse,
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  ShouldReloadFunction,
  useLoaderData,
  useRouteError,
} from '@remix-run/react';
import styles from './styles/app.css';
import { Header } from './components/header/Header';
import {
  DataFunctionArgs,
  MetaFunction,
  json,
} from '@remix-run/server-runtime';
import { getCollections } from '~/providers/collections/collections';
import { activeChannel } from '~/providers/channel/channel';
import { APP_META_DESCRIPTION, APP_META_TITLE } from '~/constants';
import { useEffect, useState } from 'react';
import { CartTray } from '~/components/cart/CartTray';
import { getActiveCustomer } from '~/providers/customer/customer';
import Footer from '~/components/footer/Footer';
import { useActiveOrder } from '~/utils/use-active-order';
import { setApiUrl } from '~/graphqlWrapper';

export const meta: MetaFunction = () => {
  return { title: APP_META_TITLE, description: APP_META_DESCRIPTION };
};

export function links() {
  return [{ rel: 'stylesheet', href: styles }];
}

const devMode =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

// The root data does not change once loaded.
export const unstable_shouldReload: ShouldReloadFunction = ({
  url,
  prevUrl,
  params,
  submission,
}) => {
  if (prevUrl.pathname === '/sign-in') {
    // just logged in
    return true;
  }
  if (prevUrl.pathname === '/account' && url.pathname === '/') {
    // just logged out
    return true;
  }
  if (submission?.action === '/checkout/payment') {
    // submitted payment for order
    return true;
  }
  return false;
};

export type RootLoaderData = {
  activeCustomer: Awaited<ReturnType<typeof getActiveCustomer>>;
  activeChannel: Awaited<ReturnType<typeof activeChannel>>;
  collections: Awaited<ReturnType<typeof getCollections>>;
};

export async function loader({ request, params, context }: DataFunctionArgs) {
  if (typeof context.VENDURE_API_URL === 'string') {
    // Set the API URL for Cloudflare Pages
    setApiUrl(context.VENDURE_API_URL);
  }
  const collections = await getCollections(request);
  const topLevelCollections = collections.filter(
    (collection) => collection.parent?.name === '__root_collection__',
  );
  const activeCustomer = await getActiveCustomer({ request });
  const loaderData: RootLoaderData = {
    activeCustomer,
    activeChannel: await activeChannel({ request }),
    collections: topLevelCollections,
  };
  return json(loaderData, { headers: activeCustomer._headers });
}

export default function App() {
  const [open, setOpen] = useState(false);
  const loaderData = useLoaderData<RootLoaderData>();
  const { collections } = loaderData;
  const {
    activeOrderFetcher,
    activeOrder,
    adjustOrderLine,
    removeItem,
    refresh,
  } = useActiveOrder();

  useEffect(() => {
    // When the loader has run, this implies we should refresh the contents
    // of the activeOrder as the user may have signed in or out.
    refresh();
  }, [loaderData]);

  return (
    <html lang="en" id="app">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="icon" href="/favicon.ico" type="image/png"></link>
        <Meta />
        <Links />
      </head>
      <body>
        <Header
          onCartIconClick={() => setOpen(!open)}
          cartQuantity={activeOrder?.totalQuantity ?? 0}
        />
        <main className="">
          <Outlet
            context={{
              activeOrderFetcher,
              activeOrder,
              adjustOrderLine,
              removeItem,
            }}
          />
        </main>
        <CartTray
          open={open}
          onClose={setOpen}
          activeOrder={activeOrder}
          adjustOrderLine={adjustOrderLine}
          removeItem={removeItem}
        />
        <ScrollRestoration />
        <Scripts />
        <Footer collections={collections}></Footer>

        {devMode && <LiveReload />}
      </body>
    </html>
  );
}



type DefaultSparseErrorPageProps = {
  tagline: string
  headline: string
  description: string
};
/**
 * You should replace this in your actual storefront to provide a better user experience.
 * You probably want to still show your footer and navigation. You will also need fallbacks
 * for your data dependant components in case your shop instance / CMS isnt responding.
 * See: https://remix.run/docs/en/main/route/error-boundary
 */
function DefaultSparseErrorPage({ tagline, headline, description }: DefaultSparseErrorPageProps) {
  return (
    <html lang="en" id="app">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="icon" href="/favicon.ico" type="image/png"></link>
        <Meta />
        <Links />
      </head>
      <body>
        <main className="flex flex-col items-center px-4 py-16 sm:py-32 text-center">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{tagline}</span>
          <h1 className="mt-2 font-bold text-gray-900 tracking-tight text-4xl sm:text-5xl">{headline}</h1>
          <p className="mt-4 text-base text-gray-500 max-w-full break-words">{description}</p>
          <div className="mt-6">
            <Link
              to="/"
              className="text-base font-medium text-primary-600 hover:text-primary-500 inline-flex gap-2"
            >
              Go back home
            </Link>
          </div>
        </main>
        <ScrollRestoration />
        <Scripts />
        {devMode && <LiveReload />}
      </body>
    </html>
  );
}

/**
 * As mentioned in the jsdoc for `DefaultSparseErrorPage` you should replace this to suit your needs.
 */
export function ErrorBoundary() {
  let tagline = "Oopsy daisy";
  let headline = "Unexpected error";
  let description = "We couldn't handle your request. Please try again later.";
  
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    tagline = `${error.status} error`;
    headline = error.statusText;
    description = error.data;
  }

  return <DefaultSparseErrorPage tagline={tagline} headline={headline} description={description} />;
}

/**
 * In Remix v2 there will only be a `ErrorBoundary`
 * As mentioned in the jsdoc for `DefaultSparseErrorPage` you should replace this to suit your needs.
 * Relevant for the future: https://remix.run/docs/en/main/route/error-boundary-v2
 */
export function CatchBoundary() {
  return ErrorBoundary();
}