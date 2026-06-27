const productionSiteUrl = "https://milkywayphotographersguild.com";
const developmentSiteUrl = "http://localhost:3000";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return process.env.NODE_ENV === "development" ? developmentSiteUrl : productionSiteUrl;
}

export function getAuthCallbackUrl(next?: string) {
  const callbackUrl = new URL("/auth/callback", getSiteUrl());

  if (next) {
    callbackUrl.searchParams.set("next", next);
  }

  return callbackUrl.toString();
}
