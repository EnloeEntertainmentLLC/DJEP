<script>
(() => {
  // ---------------------------------------------------------------------------
  // Global runtime bootstrap
  // ---------------------------------------------------------------------------

  let djepBootRevealQueued = false;
  let djepBootRevealCompleted = false;
  let djepRevealHoldCount = 0;

  function markPortalBooting() {
    document.documentElement.classList.add("djep-booting");
    document.body?.classList.add("djep-booting");
  }

  function clearPortalBooting() {
    djepBootRevealCompleted = true;
    document.documentElement.classList.remove("djep-booting");
    document.body?.classList.remove("djep-booting");
  }

  function holdPortalReveal(duration = 0) {
    djepRevealHoldCount += 1;
    let released = false;

    const release = () => {
      if (released) return;
      released = true;
      djepRevealHoldCount = Math.max(0, djepRevealHoldCount - 1);
      if (!djepBootRevealCompleted && djepRevealHoldCount === 0) {
        queuePortalReveal();
      }
    };

    if (duration > 0) {
      window.setTimeout(release, duration);
    }

    return release;
  }

  function queuePortalReveal() {
    if (djepBootRevealQueued || djepBootRevealCompleted) return;
    if (djepRevealHoldCount > 0) return;
    djepBootRevealQueued = true;

    const reveal = () => {
      if (djepBootRevealCompleted) return;
      djepBootRevealQueued = false;
      clearPortalBooting();
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(reveal);
    });

    window.setTimeout(reveal, 220);
  }

  markPortalBooting();

  function ensureViewportMeta() {
    const head = document.head || document.querySelector("head");
    if (!head) return;

    let viewportMeta = head.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement("meta");
      viewportMeta.name = "viewport";
      head.appendChild(viewportMeta);
    }

    const desiredContent = "width=device-width, initial-scale=1, viewport-fit=cover";
    if (viewportMeta.getAttribute("content") !== desiredContent) {
      viewportMeta.setAttribute("content", desiredContent);
    }
  }

  const FORCED_RESPONSIVE_PORTAL_TITLES = {
    "/clients/home.asp": "Home",
    "/clients/events.asp": "My Events",
    "/clients/profile.asp": "My Profile",
    "/clients/contact.asp": "Contact",
    "/clients/planmyevent.asp": "Plan My Event",
    "/clients/eventdetails.asp": "Event Details",
    "/clients/planningforms.asp": "Planning Forms",
    "/clients/timeline.asp": "Timeline",
    "/clients/music.asp": "Music",
    "/clients/songrequests.asp": "Song Requests",
    "/clients/guestrequests.asp": "Guest Requests",
    "/clients/requestchanges.asp": "Request Changes",
    "/clients/makeapayment.asp": "Make A Payment",
    "/clients/view.asp": "View"
  };

  const FORCED_RESPONSIVE_TITLE_ALIASES = {
    "Home Page": "Home",
    "Contact Us": "Contact"
  };

  const FORCED_RESPONSIVE_PORTAL_NAV_FALLBACK = [
    { label: "Home", href: "/clients/home.asp" },
    { label: "My Events", href: "/clients/events.asp" },
    { label: "My Profile", href: "/clients/profile.asp" },
    { label: "Contact", href: "/clients/contact.asp" }
  ];

  function getPortalPathname() {
    return window.location.pathname.toLowerCase();
  }

  function isNonMobileForceEligiblePage() {
    return Object.prototype.hasOwnProperty.call(FORCED_RESPONSIVE_PORTAL_TITLES, getPortalPathname());
  }

  function isLegacyMobileShellActive() {
    return !!(
      document.getElementById("djep-navbar-mobile") ||
      document.querySelector('script[src*="mobile-jscode.js"]') ||
      document.body?.classList.contains("mobile-hack")
    );
  }

  function getForcedMobileShellPageTitle() {
    const rawTitle = String(document.title || "").trim();
    const normalizedTitle = rawTitle.replace(/^Client Portal\s*-\s*/i, "").trim();
    if (normalizedTitle) return FORCED_RESPONSIVE_TITLE_ALIASES[normalizedTitle] || normalizedTitle;

    return FORCED_RESPONSIVE_PORTAL_TITLES[getPortalPathname()] || "Client Portal";
  }

  function sanitizeEventId(rawValue) {
    const value = String(rawValue || "").trim();
    return /^\d+$/.test(value) ? value : "";
  }

  function readEventIdFromHref(rawHref) {
    if (!rawHref) return "";

    try {
      const url = new URL(rawHref, window.location.href);
      return sanitizeEventId(url.searchParams.get("eventid"));
    } catch (error) {
      return "";
    }
  }

  function getCurrentEventId() {
    const currentUrl = new URL(window.location.href);
    const urlEventId = sanitizeEventId(currentUrl.searchParams.get("eventid"));
    if (urlEventId) return urlEventId;

    const selectorCandidates = [
      "#upcomingeventid",
      "#eventid",
      'input[name="eventid"]',
      'input#eventid',
      'form[name="ep_form"] input[name="eventid"]'
    ];

    for (const selector of selectorCandidates) {
      const element = document.querySelector(selector);
      const value = sanitizeEventId(element?.value ?? element?.textContent);
      if (value) return value;
    }

    const hrefCandidate = Array.from(document.querySelectorAll('a[href*="eventid="], form[action*="eventid="]'))
      .map((element) => readEventIdFromHref(element.getAttribute(element.tagName === "FORM" ? "action" : "href")))
      .find(Boolean);

    return hrefCandidate || "";
  }

  function normalizeShellHref(rawHref) {
    const href = String(rawHref || "").trim();
    if (!href) return "";
    if (/^(javascript:|mailto:|tel:)/i.test(href)) return href;

    try {
      return new URL(href, window.location.href).toString();
    } catch (error) {
      return href;
    }
  }

  function getShellPathFromHref(rawHref) {
    if (!rawHref || /^(javascript:|mailto:|tel:)/i.test(rawHref)) return "";

    try {
      return new URL(rawHref, window.location.href).pathname.toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function getPortalShellNavLinks() {
    const links = Array.from(document.querySelectorAll("#djep-navigation a"))
      .map((link) => {
        const href = normalizeShellHref(link.getAttribute("href") || "");
        const label = String(link.textContent || "").replace(/\s+/g, " ").trim();
        if (!href || !label) return null;

        return {
          href,
          label,
          path: getShellPathFromHref(href)
        };
      })
      .filter(Boolean);

    if (links.length) return links;

    return FORCED_RESPONSIVE_PORTAL_NAV_FALLBACK.map((entry) => ({
      href: normalizeShellHref(entry.href),
      label: entry.label,
      path: entry.path || getShellPathFromHref(entry.href)
    }));
  }

  function getForcedMobileShellSections() {
    const portalLinks = getPortalShellNavLinks();

    if (!portalLinks.length) return [];

    return [
      {
        title: "",
        links: portalLinks
      }
    ];
  }

  const FORCE_NONMOBILE_TARGET_KEY = "djep_force_nonmobile_target";
  const FORCE_NONMOBILE_PENDING_KEY = "djep_force_nonmobile_pending";

  function sanitizeForcedTarget(rawTarget) {
    if (!rawTarget) return null;

    try {
      const targetUrl = new URL(rawTarget, window.location.href);
      if (targetUrl.origin !== window.location.origin) return null;

      targetUrl.searchParams.delete("djep_force_nonmobile");
      targetUrl.searchParams.delete("djep_force_target");

      return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    } catch (error) {
      return null;
    }
  }

  function readPendingNonMobileRedirect() {
    try {
      return {
        pending: window.sessionStorage.getItem(FORCE_NONMOBILE_PENDING_KEY) === "1",
        target: sanitizeForcedTarget(window.sessionStorage.getItem(FORCE_NONMOBILE_TARGET_KEY) || "")
      };
    } catch (error) {
      return { pending: false, target: null };
    }
  }

  function clearPendingNonMobileRedirect() {
    try {
      window.sessionStorage.removeItem(FORCE_NONMOBILE_PENDING_KEY);
      window.sessionStorage.removeItem(FORCE_NONMOBILE_TARGET_KEY);
    } catch (error) {
      // no-op
    }
  }

  function queuePendingNonMobileRedirect(targetPath) {
    try {
      window.sessionStorage.setItem(FORCE_NONMOBILE_PENDING_KEY, "1");
      window.sessionStorage.setItem(FORCE_NONMOBILE_TARGET_KEY, targetPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  function buildNonMobileHomeUrl() {
    const homeUrl = new URL("home.asp", window.location.href);
    homeUrl.searchParams.set("action", "nonmobileview");
    return homeUrl.toString();
  }

  function maybeForceNonMobileView() {
    const currentUrl = new URL(window.location.href);
    const isHomePage = /\/clients\/home\.asp$/i.test(currentUrl.pathname);
    const pendingRedirect = readPendingNonMobileRedirect();

    if (pendingRedirect.pending && pendingRedirect.target && isHomePage && !isLegacyMobileShellActive()) {
      clearPendingNonMobileRedirect();
      window.location.replace(new URL(pendingRedirect.target, window.location.origin).toString());
      return true;
    }

    if (!isLegacyMobileShellActive() || !isNonMobileForceEligiblePage() || pendingRedirect.pending) {
      return false;
    }

    const targetPath = sanitizeForcedTarget(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    if (!targetPath || !queuePendingNonMobileRedirect(targetPath)) return false;

    window.location.replace(buildNonMobileHomeUrl());
    return true;
  }

  function getViewportReferenceWidth() {
    const candidates = [
      window.innerWidth,
      document.documentElement?.clientWidth,
      window.visualViewport?.width,
      screen.width
    ].filter((value) => Number.isFinite(value) && value > 0);

    return candidates.length ? Math.min(...candidates) : 1024;
  }

  function isMobileViewport() {
    return getViewportReferenceWidth() <= 767;
  }

  function isForcedMobileShellActive() {
    return !!(
      document.body?.classList.contains("djep-force-mobile-shell") ||
      document.getElementById("djep-force-mobile-shell")
    );
  }

  function syncViewportClasses() {
    const root = document.documentElement;
    const width = getViewportReferenceWidth();
    const isMobileViewport = width <= 767;
    const serverMobile = isMobileViewport;

    root.classList.toggle("djep-mobile-viewport", isMobileViewport);
    root.classList.toggle("djep-tablet-viewport", width > 767 && width <= 991);
    root.classList.toggle("djep-server-mobile", serverMobile);
  }

  function ensurePortalStylesheetRefresh() {
    const head = document.head || document.querySelector("head");
    if (!head) return;

    const primaryLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
      const href = link.getAttribute("href") || "";
      return /djep-live-v\d+\.css/i.test(href);
    });

    if (!primaryLink) return;

    const cacheBustToken = "20260319m2";
    const refreshedHref = (() => {
      try {
        const url = new URL(primaryLink.href, window.location.href);
        url.searchParams.set("djep_runtime", cacheBustToken);
        return url.toString();
      } catch (error) {
        return primaryLink.href;
      }
    })();

    let runtimeLink = document.getElementById("djep-runtime-css-link");
    if (!runtimeLink) {
      runtimeLink = document.createElement("link");
      runtimeLink.id = "djep-runtime-css-link";
      runtimeLink.rel = "stylesheet";
      runtimeLink.media = "all";
      primaryLink.insertAdjacentElement("afterend", runtimeLink);
    }

    if (runtimeLink.getAttribute("href") !== refreshedHref) {
      runtimeLink.setAttribute("href", refreshedHref);
    }
  }

  function ensureRuntimeMobileOverrides() {
    const head = document.head || document.querySelector("head");
    if (!head) return;

    const css = `
html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-panel {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  padding: 18px 14px 22px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .djep-selectmusictable,
html.djep-mobile-viewport body.djep-musicpage-ready .djep-selectmusictable > tbody,
html.djep-mobile-viewport body.djep-musicpage-ready .djep-selectmusictable > tbody > tr,
html.djep-mobile-viewport body.djep-musicpage-ready .djep-selectmusictable > tbody > tr > td,
html.djep-mobile-viewport body.djep-musicpage-ready #tabs,
html.djep-mobile-viewport body.djep-musicpage-ready #your_requests_content {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .djep-selectmusictable > tbody > tr {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 18px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-browser-column,
html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-requests-column {
  display: grid !important;
  width: 100% !important;
  gap: 16px !important;
  align-content: start !important;
  padding: 16px 14px 18px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .ui-tabs .ui-tabs-nav {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  padding-top: 12px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .ui-tabs .ui-tabs-nav li {
  margin: 0 !important;
  padding: 0 !important;
  flex: 0 1 auto !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .ui-tabs .ui-tabs-nav a {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 34px !important;
  padding: 0 12px !important;
  font-size: 10px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-control-table {
  width: 100% !important;
  border-spacing: 0 10px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-control-table tr.djep-music-search-row,
html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-control-table tr.djep-music-filter-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 8px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-control-table tr.djep-music-search-row td,
html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-control-table tr.djep-music-filter-row td {
  width: auto !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready .djep-searchbutton {
  width: 100% !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready #your_requests_content {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 16px !important;
  padding: 16px !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready #requests_accordion,
html.djep-mobile-viewport body.djep-musicpage-ready .djep-music-request-meta--footer,
html.djep-mobile-viewport body.djep-musicpage-ready #saved_playlists_content {
  width: 100% !important;
  max-width: 100% !important;
}

html.djep-mobile-viewport body.djep-musicpage-ready #requests_accordion > .ui-accordion-content,
html.djep-mobile-viewport body.djep-musicpage-ready #requests_accordion > .ui-accordion-content > [id^="request_table_div_"],
html.djep-mobile-viewport body.djep-musicpage-ready #requests_accordion > .ui-accordion-content table,
html.djep-mobile-viewport body.djep-musicpage-ready #requests_accordion > .ui-accordion-content tbody,
html.djep-mobile-viewport body.djep-musicpage-ready #requests_accordion > .ui-accordion-content tr,
html.djep-mobile-viewport body.djep-musicpage-ready #requests_accordion > .ui-accordion-content td {
  width: 100% !important;
  max-width: 100% !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-panel > .djep-titlebar {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 14px !important;
  padding: 18px !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-panel > .djep-titlebar .pull-right,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-toolbar-meta {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 12px !important;
  width: 100% !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-save-top,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-meta-card {
  width: 100% !important;
  max-width: none !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-panel > table,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-panel > table > tbody,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-panel > table > tbody > tr,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-panel > table > tbody > tr > td {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-panel #djep-timelinerow_header {
  display: none !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody {
  display: block !important;
  width: 100% !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:first-child,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:has(.djep-sectiontitle) {
  display: none !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 10px !important;
  margin: 0 0 12px !important;
  padding: 14px !important;
  border: 1px solid rgba(216, 223, 235, 0.92) !important;
  border-radius: 18px !important;
  background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%) !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(1),
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(2),
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(3),
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(4) {
  display: block !important;
  width: 100% !important;
  padding: 0 !important;
  border: 0 !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td::before {
  display: block !important;
  margin-bottom: 6px !important;
  color: #76839a !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(1)::before { content: "Time" !important; }
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(2)::before { content: "Activity" !important; }
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(3)::before { content: "Comments" !important; }
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable > tbody > tr:not(:has(.djep-sectiontitle)) > td:nth-child(4)::before { content: "Actions" !important; margin-bottom: 10px !important; }

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timelinetable td:last-child > div {
  justify-content: flex-start !important;
  width: 100% !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready #djep-timelinerow_footer td:last-child > div {
  flex-direction: column !important;
  align-items: stretch !important;
}

html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-cancel-button,
html.djep-mobile-viewport body.djep-timelinepage-ready .djep-timeline-save-bottom {
  width: 100% !important;
  min-width: 0 !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-workspace,
html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-entry-grid {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 18px !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-column,
html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-column-main,
html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-column-side {
  width: 100% !important;
  max-width: 100% !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-entry-panel .djep-payment-amount-field {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  width: 100% !important;
  max-width: none !important;
  min-height: 58px !important;
  padding: 8px 10px 8px 14px !important;
  background: #fff !important;
  border: 1px solid #d8dfeb !important;
  border-radius: 16px !important;
  box-shadow: 0 6px 16px rgba(17, 26, 46, 0.04) !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-currency {
  flex: 0 0 auto !important;
  color: #101729 !important;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal #amountdollars {
  display: block !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  max-width: none !important;
  min-height: 40px !important;
  padding: 0 !important;
  line-height: 40px !important;
  color: #101729 !important;
  -webkit-text-fill-color: #101729 !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal #amountdollars::placeholder {
  color: #98a2b3 !important;
  -webkit-text-fill-color: #98a2b3 !important;
  opacity: 1 !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-entry-panel .djep-actionbutton,
html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-entry-panel button[type="submit"] {
  width: 100% !important;
  min-width: 0 !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-column-side .djep-payment-altlinks {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 12px !important;
}

html.djep-mobile-viewport body.djep-paymentpage-ready #page_paypal .djep-payment-column-side .djep-payment-altlink {
  min-height: 72px !important;
}

body.djep-force-mobile-shell {
  position: static !important;
  inset: auto !important;
  width: 100% !important;
  min-height: 100% !important;
  height: auto !important;
  overflow: visible !important;
  -webkit-overflow-scrolling: touch !important;
}

body.djep-force-mobile-shell-open {
  position: static !important;
  overflow: visible !important;
}

body.djep-force-mobile-shell #djep-header,
body.djep-force-mobile-shell #djep-navbar {
  display: none !important;
}

body.djep-force-mobile-shell #djep-page {
  width: calc(100% - 16px) !important;
  max-width: calc(100vw - 16px) !important;
  padding-top: calc(env(safe-area-inset-top, 0px) + 76px) !important;
  overflow-x: hidden !important;
}

body.djep-force-mobile-shell #djep-content {
  border-radius: 24px !important;
}

body.djep-force-mobile-shell.djep-timelinepage-ready #djep-content > h2.djep-h2,
body.djep-force-mobile-shell.djep-paymentpage-ready #page_paypal > h2.djep-h2,
body.djep-force-mobile-shell.djep-paymentpage-ready #page_paypal > form > h2.djep-h2 {
  margin-top: 0 !important;
}

body.djep-force-mobile-shell.djep-musicpage-ready form[name="ep_form"] > h2.djep-h2 {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

html.djep-mobile-viewport body.djep-force-mobile-shell.djep-musicpage-ready .ui-tabs .ui-tabs-nav {
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  padding-bottom: 6px !important;
  scrollbar-width: none !important;
  -webkit-overflow-scrolling: touch !important;
}

html.djep-mobile-viewport body.djep-force-mobile-shell.djep-musicpage-ready .ui-tabs .ui-tabs-nav::-webkit-scrollbar {
  display: none !important;
}

html.djep-mobile-viewport body.djep-force-mobile-shell.djep-musicpage-ready .ui-tabs .ui-tabs-nav li {
  flex: 0 0 auto !important;
}

html.djep-mobile-viewport body.djep-force-mobile-shell.djep-musicpage-ready .ui-tabs .ui-tabs-nav a {
  white-space: nowrap !important;
}

#djep-force-mobile-shell {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 10020 !important;
  padding: calc(env(safe-area-inset-top, 0px) + 8px) 8px 0 !important;
  pointer-events: none !important;
}

#djep-force-mobile-shell .djep-force-mobile-shell__bar,
#djep-force-mobile-shell .djep-force-mobile-shell__overlay,
#djep-force-mobile-shell .djep-force-mobile-shell__panel {
  pointer-events: auto !important;
}

.djep-force-mobile-shell__bar {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 12px !important;
  min-height: 54px !important;
  padding: 10px 12px 10px 14px !important;
  background: linear-gradient(180deg, rgba(27, 37, 57, 0.98), rgba(20, 28, 45, 0.98)) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 18px !important;
  box-shadow: 0 18px 34px rgba(17, 26, 46, 0.24) !important;
}

.djep-force-mobile-shell__title {
  min-width: 0 !important;
  color: #f8fafc !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.djep-force-mobile-shell__toggle {
  display: inline-grid !important;
  place-items: center !important;
  width: 42px !important;
  height: 42px !important;
  padding: 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
}

.djep-force-mobile-shell__toggle-line {
  display: block !important;
  width: 18px !important;
  height: 2px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  transition: transform 0.22s ease, opacity 0.22s ease !important;
}

.djep-force-mobile-shell__toggle-inner {
  display: grid !important;
  gap: 4px !important;
}

body.djep-force-mobile-shell-open .djep-force-mobile-shell__toggle-line:nth-child(1) {
  transform: translateY(6px) rotate(45deg) !important;
}

body.djep-force-mobile-shell-open .djep-force-mobile-shell__toggle-line:nth-child(2) {
  opacity: 0 !important;
}

body.djep-force-mobile-shell-open .djep-force-mobile-shell__toggle-line:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg) !important;
}

.djep-force-mobile-shell__overlay {
  display: none !important;
  position: fixed !important;
  inset: 0 !important;
  background: rgba(10, 17, 30, 0.22) !important;
  backdrop-filter: blur(2px) !important;
}

.djep-force-mobile-shell__panel {
  display: none !important;
  margin-top: 10px !important;
  padding: 14px !important;
  max-height: calc(100vh - env(safe-area-inset-top, 0px) - 92px) !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98)) !important;
  border: 1px solid rgba(255, 255, 255, 0.9) !important;
  border-radius: 22px !important;
  box-shadow: 0 18px 34px rgba(17, 26, 46, 0.18) !important;
}

body.djep-force-mobile-shell-open .djep-force-mobile-shell__overlay,
body.djep-force-mobile-shell-open .djep-force-mobile-shell__panel {
  display: block !important;
}

.djep-force-mobile-shell__sections {
  display: grid !important;
  gap: 16px !important;
}

.djep-force-mobile-shell__section {
  display: grid !important;
  gap: 8px !important;
}

.djep-force-mobile-shell__section-title {
  padding: 2px 4px 0 !important;
  color: #667085 !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
}

.djep-force-mobile-shell__nav {
  display: grid !important;
  gap: 8px !important;
}

.djep-force-mobile-shell__link {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  min-height: 50px !important;
  padding: 0 16px !important;
  border: 1px solid rgba(216, 223, 235, 0.96) !important;
  border-radius: 16px !important;
  background: #ffffff !important;
  color: #243049 !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  text-decoration: none !important;
  box-shadow: 0 6px 16px rgba(17, 26, 46, 0.06) !important;
}

.djep-force-mobile-shell__link::after {
  content: "" !important;
  flex: 0 0 auto !important;
  width: 8px !important;
  height: 8px !important;
  margin-left: 12px !important;
  border-top: 2px solid currentColor !important;
  border-right: 2px solid currentColor !important;
  transform: rotate(45deg) !important;
  opacity: 0.55 !important;
}

.djep-force-mobile-shell__link--active {
  color: #ffffff !important;
  background: linear-gradient(135deg, rgba(33, 43, 64, 0.98), rgba(51, 63, 90, 0.94)) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

.djep-force-mobile-shell__link--active::after {
  opacity: 0.82 !important;
}
`.trim();

    upsertRuntimeStyle("djep-runtime-mobile-overrides", css);
  }

  function ensureForcedMobileShell() {
    const shouldUseShell = isNonMobileForceEligiblePage() && isMobileViewport() && !isLegacyMobileShellActive();
    const body = document.body;
    const pageRoot = document.getElementById("djep-page");
    if (!body || !pageRoot) return;

    const closeShell = () => {
      body.classList.remove("djep-force-mobile-shell-open");
      const shell = document.getElementById("djep-force-mobile-shell");
      if (!shell) return;
      const toggle = shell.querySelector(".djep-force-mobile-shell__toggle");
      const overlay = shell.querySelector(".djep-force-mobile-shell__overlay");
      const panel = shell.querySelector(".djep-force-mobile-shell__panel");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (overlay instanceof HTMLElement) overlay.hidden = true;
      if (panel instanceof HTMLElement) panel.hidden = true;
    };

    body.classList.toggle("djep-force-mobile-shell", shouldUseShell);

    let shell = document.getElementById("djep-force-mobile-shell");
    if (!shouldUseShell) {
      closeShell();
      if (shell) shell.hidden = true;
      return;
    }

    const currentPath = getPortalPathname();
    const title = getForcedMobileShellPageTitle();
    const sections = getForcedMobileShellSections();

    if (!shell) {
      shell = document.createElement("div");
      shell.id = "djep-force-mobile-shell";
      shell.className = "djep-force-mobile-shell";
      shell.innerHTML = `
        <div class="djep-force-mobile-shell__overlay" hidden></div>
        <div class="djep-force-mobile-shell__bar">
          <div class="djep-force-mobile-shell__title"></div>
          <button type="button" class="djep-force-mobile-shell__toggle" aria-expanded="false" aria-controls="djep-force-mobile-shell-panel" aria-label="Open menu">
            <span class="djep-force-mobile-shell__toggle-inner" aria-hidden="true">
              <span class="djep-force-mobile-shell__toggle-line"></span>
              <span class="djep-force-mobile-shell__toggle-line"></span>
              <span class="djep-force-mobile-shell__toggle-line"></span>
            </span>
          </button>
        </div>
        <div class="djep-force-mobile-shell__panel" id="djep-force-mobile-shell-panel" hidden>
          <div class="djep-force-mobile-shell__sections"></div>
        </div>
      `.trim();
      pageRoot.insertAdjacentElement("beforebegin", shell);
    }

    shell.hidden = false;

    const titleNode = shell.querySelector(".djep-force-mobile-shell__title");
    const overlay = shell.querySelector(".djep-force-mobile-shell__overlay");
    const toggle = shell.querySelector(".djep-force-mobile-shell__toggle");
    const panel = shell.querySelector(".djep-force-mobile-shell__panel");
    const sectionsRoot = shell.querySelector(".djep-force-mobile-shell__sections");

    if (titleNode) titleNode.textContent = title;

    if (sectionsRoot instanceof HTMLElement) {
      sectionsRoot.textContent = "";

      sections.forEach((section) => {
        if (!section?.links?.length) return;

        const sectionNode = document.createElement("section");
        sectionNode.className = "djep-force-mobile-shell__section";

        if (section.title) {
          const sectionTitle = document.createElement("div");
          sectionTitle.className = "djep-force-mobile-shell__section-title";
          sectionTitle.textContent = section.title;
          sectionNode.appendChild(sectionTitle);
        }

        const nav = document.createElement("nav");
        nav.className = "djep-force-mobile-shell__nav";
        nav.setAttribute("aria-label", `${section.title || "Client portal"} navigation`);

        section.links.forEach((entry) => {
          const item = document.createElement("a");
          item.className = "djep-force-mobile-shell__link";
          item.href = entry.href;
          item.textContent = entry.label;

          if (entry.path && currentPath === entry.path) {
            item.classList.add("djep-force-mobile-shell__link--active");
          }

          item.addEventListener("click", () => {
            closeShell();
          });

          nav.appendChild(item);
        });

        sectionNode.appendChild(nav);
        sectionsRoot.appendChild(sectionNode);
      });
    }

    if (shell.dataset.djepShellBound !== "1") {
      shell.dataset.djepShellBound = "1";

      if (toggle) {
        toggle.addEventListener("click", () => {
          const nextOpen = !body.classList.contains("djep-force-mobile-shell-open");
          body.classList.toggle("djep-force-mobile-shell-open", nextOpen);
          toggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
          if (overlay instanceof HTMLElement) overlay.hidden = !nextOpen;
          if (panel instanceof HTMLElement) panel.hidden = !nextOpen;
        });
      }

      overlay?.addEventListener("click", closeShell);

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeShell();
      });
    }
  }

  function injectSharedHooks() {
    if (maybeForceNonMobileView()) return true;

    ensureViewportMeta();
    document.documentElement.classList.add("djep-overhaul-ready");

    const refreshSharedRuntime = () => {
      syncViewportClasses();
      if (isMobileViewport()) {
        ensurePortalStylesheetRefresh();
        ensureRuntimeMobileOverrides();
      }
      ensureForcedMobileShell();
    };

    refreshSharedRuntime();

    if (!document.documentElement.dataset.djepViewportBound) {
      document.documentElement.dataset.djepViewportBound = "1";
      window.addEventListener("resize", refreshSharedRuntime, { passive: true });
      window.addEventListener("orientationchange", refreshSharedRuntime, { passive: true });
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Shared DOM helpers
  // ---------------------------------------------------------------------------

  function autosizeTextarea(textarea) {
    const resize = () => {
      textarea.style.height = "0px";
      textarea.style.height = `${Math.max(44, textarea.scrollHeight)}px`;
    };

    if (!textarea.dataset.djepAutosizeBound) {
      textarea.dataset.djepAutosizeBound = "1";
      textarea.addEventListener("input", resize);
    }

    resize();
  }

  function readTimelineRowValues(form, index) {
    return {
      time: form[`ett_time_${index}`]?.value || "",
      name: form[`ett_name_${index}`]?.value || "",
      comments: form[`ett_comments_${index}`]?.value || "",
    };
  }

  function writeTimelineRowValues(form, index, values) {
    if (form[`ett_time_${index}`]) form[`ett_time_${index}`].value = values.time || "";
    if (form[`ett_name_${index}`]) form[`ett_name_${index}`].value = values.name || "";
    if (form[`ett_comments_${index}`]) form[`ett_comments_${index}`].value = values.comments || "";
  }

  function timelineRowHasContent(form, index) {
    const values = readTimelineRowValues(form, index);
    return `${values.time}${values.name}${values.comments}`.trim().length > 0;
  }

  function shiftTimelineRowsDown(form, startIndex) {
    if (timelineRowHasContent(form, 49)) {
      window.alert("Sorry, only 50 activities can be added.");
      return false;
    }

    for (let i = 49; i > startIndex; i -= 1) {
      writeTimelineRowValues(form, i, readTimelineRowValues(form, i - 1));
    }

    writeTimelineRowValues(form, startIndex, { time: "", name: "", comments: "" });
    return true;
  }

  function moveTimelineRow(form, fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    const dragged = readTimelineRowValues(form, fromIndex);

    if (toIndex > fromIndex) {
      for (let i = fromIndex; i < toIndex; i += 1) {
        writeTimelineRowValues(form, i, readTimelineRowValues(form, i + 1));
      }
    } else {
      for (let i = fromIndex; i > toIndex; i -= 1) {
        writeTimelineRowValues(form, i, readTimelineRowValues(form, i - 1));
      }
    }

    writeTimelineRowValues(form, toIndex, dragged);
  }

  function patchedHandleDropEventForTimeline(event, ui) {
    const form = document.ep_form;
    if (!form) return;

    const draggableId = ui?.draggable?.attr?.("id") || "";
    const droppableId = (this && this.id) || "";
    const toIndex = Number(droppableId.replace("timeline_row_", ""));

    if (!Number.isInteger(toIndex) || toIndex < 0) return;

    if (draggableId.includes("timeline_icon_row_")) {
      const fromIndex = Number(draggableId.replace("timeline_icon_row_", ""));
      if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex === toIndex) return;
      moveTimelineRow(form, fromIndex, toIndex);
    } else {
      const activity = document.getElementById(draggableId);
      if (!activity) return;
      if (timelineRowHasContent(form, toIndex) && !shiftTimelineRowsDown(form, toIndex)) return;

      const current = readTimelineRowValues(form, toIndex);
      writeTimelineRowValues(form, toIndex, {
        time: current.time,
        name: activity.innerHTML,
        comments: current.comments,
      });
    }

    markFormDirty();
    try {
      console.log(`formisdirty${window.formisdirty}`);
    } catch (error) {
      // no-op
    }
  }

  function parseSlashDate(value) {
    const match = (value || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!match) return null;

    let year = Number(match[3]);
    if (year < 100) year += 2000;

    const month = Number(match[1]) - 1;
    const day = Number(match[2]);
    const date = new Date(year, month, day);

    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function formatShortDate(date) {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function upsertRuntimeStyle(id, css) {
    const head = document.head || document.querySelector("head");
    if (!head || !id) return null;

    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      head.appendChild(style);
    }

    if (style.textContent !== css) {
      style.textContent = css;
    }

    return style;
  }

  function runAfterDelays(callback, delays) {
    if (typeof callback !== "function" || !Array.isArray(delays)) return;
    delays.forEach((delay) => {
      window.setTimeout(callback, delay);
    });
  }

  function bindDatasetOnce(node, key, callback) {
    if (!(node instanceof HTMLElement) || !key) return false;
    if (node.dataset[key] === "1") return false;
    node.dataset[key] = "1";
    if (typeof callback === "function") {
      callback(node);
    }
    return true;
  }

  function isLocalPreviewEnvironment() {
    return (
      window.location.protocol === "file:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  function markFormDirty() {
    window.formisdirty = true;
    if (typeof window.needToConfirm !== "undefined") {
      window.needToConfirm = true;
    }
  }

  function clearLegacyLeaveGuards() {
    try {
      window.onbeforeunload = null;
    } catch (error) {}

    try {
      if (typeof window.needToConfirm !== "undefined") {
        window.needToConfirm = false;
      }
    } catch (error) {}

    try {
      if (typeof window.formisdirty !== "undefined") {
        window.formisdirty = false;
      }
    } catch (error) {}
  }

  // ---------------------------------------------------------------------------
  // Shared page detection / init dispatch
  // ---------------------------------------------------------------------------

  function getCurrentUrl() {
    return new URL(window.location.href);
  }

  function getCurrentAction() {
    return getCurrentUrl().searchParams.get("action") || "";
  }

  function titleIncludes(value) {
    return document.title.indexOf(value) > -1;
  }

  function hasAnySelector(selector) {
    return !!document.querySelector(selector);
  }

  function runIf(condition, callback) {
    if (condition) callback();
  }

  function initMusicPageWithStabilityPasses() {
    holdPortalReveal(780);
    initMusicPage();
    initSpotifyBrowseStabilityOverride();
    runAfterDelays(initMusicPage, [500, 1500]);
    runAfterDelays(initSpotifyBrowseStabilityOverride, [650, 1650]);
  }

  function shouldInitDocumentPage() {
    const action = getCurrentAction();
    return (
      (titleIncludes("View") ||
        titleIncludes("Payment Receipt") ||
        action === "view_saved_document" ||
        action === "view_document_template") &&
      hasAnySelector(".djep-viewdocumentbox, .djep-printdocumentbox")
    );
  }

  function shouldInitPlanningFormsPage() {
    return titleIncludes("Planning Forms") || hasAnySelector(".djep-planningformseditbox #ep_form");
  }

  function shouldInitGuestSelectMusicPage() {
    return getPortalPathname() === "/guests/selectmusic.asp" && hasAnySelector(".djep-selectyourmusicbox");
  }

  function shouldInitMusicPage() {
    return hasAnySelector('form[name="ep_form"][action*="browsemusic.asp"] .djep-selectyourmusicbox, form[name="ep_form"][action*="browsemusic.asp"] .djep-music-panel');
  }

  function runPageInitializers() {
    runIf(titleIncludes("Home Page") || hasAnySelector(".djep-welcometextbox"), initHomePage);
    runIf(titleIncludes("My Events") || document.getElementById("page_eventslist"), initEventsPage);
    runIf(titleIncludes("Profile") || hasAnySelector(".djep-contactdetailsbox"), initProfilePage);
    runIf(titleIncludes("Contact") || hasAnySelector(".djep-contactformbox"), initContactPage);
    runIf(shouldInitDocumentPage(), initDocumentPage);
    runIf(titleIncludes("Request Changes") || hasAnySelector(".djep-requestchangesformbox"), initRequestChangesPage);

    runIf(!!document.getElementById("page_paypal"), () => {
      bindPaymentAltInteractions();
      normalizePaymentAltModal();
      retargetExistingPaymentAltLinks();
      initMakePaymentPage();
    });

    initPaymentSuccessPage();

    runIf(!!document.getElementById("page_eventdetails"), initEventDetailsPage);
    runIf(!!document.getElementById("page_planmyevent"), initPlanMyEventPage);

    runIf(shouldInitPlanningFormsPage(), () => {
      initPlanningFormsEditPage();
      initPlanningFormsLandingPage();
    });

    runIf(shouldInitGuestSelectMusicPage(), initGuestSelectMusicPage);
    runIf(hasAnySelector(".djep-edittimelinebox, .djep-timeline-panel"), initTimelinePage);
    runIf(shouldInitMusicPage(), initMusicPageWithStabilityPasses);
    runIf(titleIncludes("Guest Requests"), initGuestRequestsPage);
    runIf(titleIncludes("Song Requests"), initSongRequestsPage);
  }

  function removePortalNotifications(root = document) {
    const scope = root && root.querySelectorAll ? root : document;
    const notificationSelector = [
      "#alert_message_div",
      "#alert_message2_div",
      ".djep-titlebarconfirm",
      ".djep-titlebarmusicconfirm",
      ".djep-successtickimage"
    ].join(", ");

    scope.querySelectorAll(notificationSelector).forEach((node) => {
      const removable =
        node.closest(".djep-profile-confirmation-row") ||
        node.closest("#password_save_confirmation") ||
        node.closest('div[align="center"]') ||
        node.closest("tr") ||
        node;
      removable.remove();
    });

    scope.querySelectorAll('div[align="center"]').forEach((node) => {
      if (!node.querySelector(notificationSelector)) return;
      node.remove();
    });
  }

  let portalNotificationsObserverBound = false;
  function bindPortalNotificationsObserver() {
    if (portalNotificationsObserverBound || !document.body) return;
    portalNotificationsObserverBound = true;

    let scheduled = false;
    const runCleanup = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        removePortalNotifications(document);
      });
    };

    const observer = new MutationObserver(runCleanup);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------------------
  // Core portal page modules
  // ---------------------------------------------------------------------------

  function copyTextValue(value) {
    const text = cleanText(value);
    if (!text) return;

    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "absolute";
    field.style.left = "-9999px";
    document.body.append(field);
    field.select();
    field.setSelectionRange(0, text.length);
    document.execCommand("copy");
    field.remove();

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  function normalizeMailingAddressText(value) {
    const text = cleanText(value || "");
    if (!text) return "";

    return text
      .replace(/\s*\n\s*/g, ", ")
      .replace(/\s{2,}/g, " ")
      .replace(/(#\d+)([A-Z])/g, "$1 $2")
      .trim();
  }

  function parseCompanyMailingAddressFromMarkup(markup) {
    const html = markup || "";
    if (!html) return "";

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const mailCell =
        doc.querySelector("#djep-contactmail")?.closest("tr")?.querySelectorAll("td")?.[1] ||
        doc.querySelector("#djep-contactmail + td");
      if (mailCell) {
        return normalizeMailingAddressText(mailCell.innerHTML.replace(/<br\s*\/?>/gi, "\n"));
      }
    } catch (error) {}

    const sanitizedHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");

    const match =
      sanitizedHtml.match(/id\s*=\s*(?:["']?djep-contactmail["']?)[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
      sanitizedHtml.match(/Mailing Address:\s*([\s\S]*?)(?:<\/td>|<br|<\/tr>)/i);
    if (!match) return "";

    return normalizeMailingAddressText(match[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
  }

  let companyMailingAddressPromise = null;
  function getCompanyMailingAddress(fallback = "") {
    const cached = cleanText(window.__djepCompanyMailingAddress || "");
    if (cached) return Promise.resolve(cached);
    if (companyMailingAddressPromise) return companyMailingAddressPromise;

    companyMailingAddressPromise = new Promise((resolve) => {
      const finish = (value) => {
        const resolved = normalizeMailingAddressText(value || fallback || "");
        if (resolved) {
          window.__djepCompanyMailingAddress = resolved;
        }
        resolve(resolved);
      };

      try {
        const currentAddress =
          document.getElementById("djep-contactmail") || document.body?.classList?.contains("djep-contactpage-ready")
            ? parseCompanyMailingAddressFromMarkup(document.documentElement?.outerHTML || "")
            : "";
        if (currentAddress) {
          finish(currentAddress);
          return;
        }

        const syncRequest = new XMLHttpRequest();
        syncRequest.open("GET", "/clients/contact.asp", false);
        syncRequest.send(null);
        const syncAddress = parseCompanyMailingAddressFromMarkup(syncRequest.responseText || "");
        if (syncAddress) {
          finish(syncAddress);
          return;
        }

        if (typeof fetch === "function") {
          fetch("/clients/contact.asp", {
            credentials: "include",
            headers: { "X-Requested-With": "XMLHttpRequest" },
          })
            .then((response) => response.text())
            .then((html) => finish(parseCompanyMailingAddressFromMarkup(html)))
            .catch(() => finish(""));
          return;
        }

        const xhr = new XMLHttpRequest();
        xhr.open("GET", "/clients/contact.asp", true);
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return;
          finish(parseCompanyMailingAddressFromMarkup(xhr.responseText || ""));
        };
        xhr.onerror = () => finish("");
        xhr.send();
      } catch (error) {
        finish("");
      }
    }).finally(() => {
      companyMailingAddressPromise = null;
    });

    return companyMailingAddressPromise;
  }

  function readCompanyMailingAddressSync() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "/clients/contact.asp", false);
      xhr.send(null);
      const html = xhr.responseText || "";
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const mailCell =
        doc.querySelector("#djep-contactmail")?.closest("tr")?.querySelectorAll("td")?.[1] ||
        doc.querySelector("#djep-contactmail + td");

      let resolved = mailCell ? normalizeMailingAddressText(mailCell.innerHTML.replace(/<br\s*\/?>/gi, "\n")) : "";
      if (!resolved) {
        const sanitizedHtml = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ");
        const match =
          sanitizedHtml.match(/id\s*=\s*(?:["']?djep-contactmail["']?)[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
          sanitizedHtml.match(/Mailing Address:\s*([\s\S]*?)(?:<\/td>|<br|<\/tr>)/i);
        resolved = match ? normalizeMailingAddressText(match[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")) : "";
      }

      if (resolved) {
        window.__djepCompanyMailingAddress = resolved;
      }
      return resolved;
    } catch (error) {
      return normalizeMailingAddressText(window.__djepCompanyMailingAddress || "");
    }
  }

  function normalizePaymentAltModal(modal = document.getElementById("djep-payment-alt-modal")) {
    if (!(modal instanceof HTMLElement)) return;

    modal.querySelectorAll(".djep-payment-alt-modal__note").forEach((node) => node.remove());

    const titleText = cleanText(modal.querySelector(".djep-payment-alt-modal__title")?.textContent || "");
    const isCheckModal = /pay by check/i.test(titleText);
    modal.classList.toggle("djep-payment-alt-modal--check", isCheckModal);
    const frame = modal.querySelector(".djep-payment-alt-modal__frame");
    const checkPanel = modal.querySelector(".djep-payment-alt-modal__check");
    const address = modal.querySelector(".djep-payment-alt-modal__address");
    const openLink = modal.querySelector(".djep-payment-alt-modal__open");

    if (isCheckModal) {
      if (frame instanceof HTMLElement) frame.hidden = true;
      if (checkPanel instanceof HTMLElement) {
        checkPanel.hidden = false;
        checkPanel.removeAttribute("hidden");
      }
      if (openLink instanceof HTMLElement) openLink.hidden = true;
    } else {
      if (frame instanceof HTMLElement) frame.hidden = false;
      if (checkPanel instanceof HTMLElement) {
        checkPanel.hidden = true;
        checkPanel.setAttribute("hidden", "");
      }
      if (address instanceof HTMLElement) {
        address.textContent = "";
      }
      if (openLink instanceof HTMLElement) openLink.hidden = false;
    }
  }

  function getPaymentAltModal() {
    let modal = document.getElementById("djep-payment-alt-modal");
    if (
      modal &&
      (!modal.querySelector(".djep-payment-alt-modal__check") ||
        modal.querySelector(".djep-payment-alt-modal__note"))
    ) {
      modal.remove();
      modal = null;
    }
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "djep-payment-alt-modal";
    modal.className = "djep-payment-alt-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="djep-payment-alt-modal__backdrop" data-close="true"></div>
      <div class="djep-payment-alt-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="djep-payment-alt-modal-title">
        <div class="djep-payment-alt-modal__header">
          <h3 id="djep-payment-alt-modal-title" class="djep-payment-alt-modal__title">Other Ways to Pay</h3>
          <button type="button" class="djep-payment-alt-modal__close" aria-label="Close payment window" data-close="true">x</button>
        </div>
        <div class="djep-payment-alt-modal__body">
          <iframe class="djep-payment-alt-modal__frame" title="Alternate payment method"></iframe>
          <div class="djep-payment-alt-modal__check" hidden>
            <p class="djep-payment-alt-modal__check-copy">Mail your check to the address below.</p>
            <div class="djep-payment-alt-modal__address"></div>
            <button type="button" class="djep-payment-alt-modal__copy">Copy Mailing Address</button>
          </div>
        </div>
        <div class="djep-payment-alt-modal__actions">
          <a class="djep-payment-alt-modal__open" target="_blank" rel="noopener">Open in new tab</a>
        </div>
      </div>
    `;

    const close = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      const frame = modal.querySelector(".djep-payment-alt-modal__frame");
      if (frame) frame.setAttribute("src", "about:blank");
      const checkPanel = modal.querySelector(".djep-payment-alt-modal__check");
      if (checkPanel instanceof HTMLElement) {
        checkPanel.hidden = true;
      }
    };

    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.close === "true") {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) {
        close();
      }
    });

    const copyButton = modal.querySelector(".djep-payment-alt-modal__copy");
    copyButton?.addEventListener("click", () => {
      const addressText = modal.querySelector(".djep-payment-alt-modal__address")?.textContent || "";
      copyTextValue(addressText);
    });

    document.body.append(modal);
    normalizePaymentAltModal(modal);
    return modal;
  }

  async function openPaymentAltModal(item) {
    if (item?.kind === "check") {
      await openPaymentCheckModal();
      return;
    }

    const modal = getPaymentAltModal();
    const title = modal.querySelector(".djep-payment-alt-modal__title");
    const frame = modal.querySelector(".djep-payment-alt-modal__frame");
    const checkPanel = modal.querySelector(".djep-payment-alt-modal__check");
    const address = modal.querySelector(".djep-payment-alt-modal__address");
    const openLink = modal.querySelector(".djep-payment-alt-modal__open");

    if (title) title.textContent = item?.alt || "Other Ways to Pay";
    if (!item?.href) return;
    if (frame) frame.setAttribute("src", item.href);
    if (frame instanceof HTMLElement) frame.hidden = false;
    if (checkPanel instanceof HTMLElement) {
      checkPanel.hidden = true;
      checkPanel.setAttribute("hidden", "");
    }
    if (address) {
      address.textContent = "";
    }
    if (openLink) {
      openLink.hidden = false;
      openLink.setAttribute("href", item.href);
    }

    normalizePaymentAltModal(modal);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  async function openPaymentCheckModal() {
    const modal = getPaymentAltModal();
    const title = modal.querySelector(".djep-payment-alt-modal__title");
    const frame = modal.querySelector(".djep-payment-alt-modal__frame");
    const checkPanel = modal.querySelector(".djep-payment-alt-modal__check");
    const address = modal.querySelector(".djep-payment-alt-modal__address");
    const openLink = modal.querySelector(".djep-payment-alt-modal__open");

    if (title) title.textContent = "Pay by Check";
    if (frame) frame.setAttribute("src", "about:blank");
    if (frame instanceof HTMLElement) frame.hidden = true;
    if (checkPanel instanceof HTMLElement) {
      checkPanel.hidden = false;
      checkPanel.removeAttribute("hidden");
    }
    if (openLink instanceof HTMLElement) openLink.hidden = true;

    const addressText = readCompanyMailingAddressSync() || (await getCompanyMailingAddress(""));
    if (address) {
      address.textContent = addressText || "Mailing address unavailable.";
    }

    normalizePaymentAltModal(modal);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    return modal;
  }

  function bindPaymentAltInteractions() {
    if (document.body.dataset.djepPaymentAltInteractionsBound === "1") return;
    document.body.dataset.djepPaymentAltInteractionsBound = "1";

    const queuePaymentAltModalSync = () => {
      [0, 120, 300].forEach((delay) => {
        window.setTimeout(() => normalizePaymentAltModal(), delay);
      });
    };

    document.addEventListener(
      "click",
      (event) => {
        const trigger = event.target instanceof Element ? event.target.closest(".djep-payment-altlink--check") : null;
        if (!trigger || !trigger.closest("#page_paypal")) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        void openPaymentCheckModal();
        queuePaymentAltModalSync();
      },
      true
    );

    document.addEventListener(
      "click",
      (event) => {
        const trigger = event.target instanceof Element ? event.target.closest(".djep-payment-altlink[href]") : null;
        if (!trigger || !trigger.closest("#page_paypal")) return;
        queuePaymentAltModalSync();
      },
      true
    );
  }

  function detectPaymentProviderKind(item = {}) {
    const href = String(item.href || "").toLowerCase();
    const alt = cleanText(item.alt || "").toLowerCase();
    const src = String(item.src || "").toLowerCase();
    const combined = `${href} ${alt} ${src}`;

    if (combined.includes("venmo")) return "venmo";
    if (combined.includes("cashapp") || combined.includes("cash app") || combined.includes("cash.app")) return "cashapp";
    if (combined.includes("zelle")) return "zelle";
    if (combined.includes("check")) return "check";
    return "";
  }

  function normalizePaymentProviderHref(rawHref = "") {
    const href = String(rawHref || "").trim();
    if (!href) return "";

    if (/^https?:\/\//i.test(href)) return href;
    if (/^(?:venmo\.com|cash\.app)\//i.test(href)) return `https://${href}`;
    if (/^\/\//.test(href)) return `https:${href}`;

    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      return href;
    }
  }

  function extractDirectPaymentProviderHrefFromMarkup(markup, item = {}) {
    const html = String(markup || "");
    const providerKind = detectPaymentProviderKind(item);
    if (!html || !providerKind) return "";

    const patternsByKind = {
      venmo: [
        /https?:\/\/(?:www\.)?venmo\.com\/[^\s"'<>]+/i,
        /(?:^|[^a-z])(venmo\.com\/[^\s"'<>]+)/i,
      ],
      cashapp: [
        /https?:\/\/cash\.app\/[^\s"'<>]+/i,
        /(?:^|[^a-z])(cash\.app\/[^\s"'<>]+)/i,
      ],
    };

    const patterns = patternsByKind[providerKind] || [];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      const rawValue = match?.[1] || match?.[0] || "";
      const normalized = normalizePaymentProviderHref(rawValue);
      if (normalized) return normalized;
    }

    return "";
  }

  const directPaymentHrefPromiseCache = new Map();
  function resolveDirectPaymentProviderHref(item = {}) {
    const originalHref = normalizePaymentProviderHref(item.href || "");
    const providerKind = detectPaymentProviderKind(item);
    if (!originalHref) return Promise.resolve("");
    if (!providerKind || providerKind === "check" || providerKind === "zelle") {
      return Promise.resolve(originalHref);
    }
    if (
      (providerKind === "venmo" && /(?:^https?:\/\/)?(?:www\.)?venmo\.com\//i.test(originalHref)) ||
      (providerKind === "cashapp" && /(?:^https?:\/\/)?cash\.app\//i.test(originalHref))
    ) {
      return Promise.resolve(originalHref);
    }

    const cacheKey = `djep-direct-payment:${originalHref}`;
    try {
      const cached = window.sessionStorage?.getItem(cacheKey) || "";
      if (cached) return Promise.resolve(cached);
    } catch (error) {}

    if (directPaymentHrefPromiseCache.has(cacheKey)) {
      return directPaymentHrefPromiseCache.get(cacheKey);
    }

    const promise = fetch(originalHref, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then((response) => response.text())
      .then((markup) => {
        const resolvedHref = extractDirectPaymentProviderHrefFromMarkup(markup, item) || originalHref;
        try {
          window.sessionStorage?.setItem(cacheKey, resolvedHref);
        } catch (error) {}
        return resolvedHref;
      })
      .catch(() => originalHref)
      .finally(() => {
        directPaymentHrefPromiseCache.delete(cacheKey);
      });

    directPaymentHrefPromiseCache.set(cacheKey, promise);
    return promise;
  }

  function retargetExistingPaymentAltLinks(scope = document) {
    const root = scope && scope.querySelector ? scope : document;
    root.querySelectorAll("#page_paypal .djep-payment-altlinks a.djep-payment-altlink").forEach((link) => {
      const item = {
        href: link.getAttribute("href") || link.href || "",
        alt: link.querySelector("img")?.getAttribute("alt") || cleanText(link.textContent || ""),
        src: link.querySelector("img")?.getAttribute("src") || "",
      };
      const providerKind = detectPaymentProviderKind(item);
      const replacement = link.cloneNode(true);
      const originalHref = normalizePaymentProviderHref(item.href || "");

      replacement.href = originalHref;
      replacement.target = "_blank";
      replacement.rel = "noopener noreferrer";

      if (providerKind && providerKind !== "check") {
        replacement.addEventListener("click", async (event) => {
          const resolvedHref = replacement.dataset.djepResolvedHref || "";
          if (resolvedHref) {
            replacement.href = resolvedHref;
            return;
          }

          event.preventDefault();
          const pendingWindow = window.open("about:blank", "_blank", "noopener");
          const finalHref = await resolveDirectPaymentProviderHref(item);
          const targetHref = finalHref || originalHref;

          if (targetHref) {
            replacement.dataset.djepResolvedHref = targetHref;
            replacement.href = targetHref;
          }

          if (pendingWindow && targetHref) {
            pendingWindow.location = targetHref;
          } else if (targetHref) {
            window.open(targetHref, "_blank", "noopener");
          }
        });

        void resolveDirectPaymentProviderHref(item).then((resolvedHref) => {
          if (!resolvedHref) return;
          replacement.dataset.djepResolvedHref = resolvedHref;
          replacement.href = resolvedHref;
        });
      }

      link.replaceWith(replacement);
    });
  }

  function extractKeyValueLines(html) {
    return (html || "")
      .split(/<br\s*\/?>/i)
      .map((line) => line.replace(/<[^>]+>/g, " "))
      .map(cleanText)
      .filter(Boolean)
      .reduce((acc, line) => {
        const parts = line.split(":");
        if (parts.length < 2) return acc;

        const key = cleanText(parts.shift()).toLowerCase();
        const value = cleanText(parts.join(":"));
        if (key && value) acc[key] = value;
        return acc;
      }, {});
  }

  function createMetaChip(label, value) {
    const item = document.createElement("span");
    item.className = "djep-home-event-meta-item";

    const itemLabel = document.createElement("span");
    itemLabel.className = "djep-home-event-meta-label";
    itemLabel.textContent = label;

    const itemValue = document.createElement("span");
    itemValue.className = "djep-home-event-meta-value";
    itemValue.textContent = value;

    item.append(itemLabel, itemValue);
    return item;
  }

  function buildProfileFieldGroups(table, options = {}) {
    if (!table) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "djep-profile-groups";
    let currentBody = null;
    const hiddenLabels = new Set((options.hiddenLabels || []).map((label) => label.toLowerCase()));
    const collapseGroups = Boolean(options.collapseGroups);
    const singleGroupTitle = cleanText(options.singleGroupTitle || "");
    const hideEmptyDisplayRows = Boolean(options.hideEmptyDisplayRows);
    let singleGroupInitialized = false;

    const ensureGroup = (titleText = "") => {
      const group = document.createElement("section");
      group.className = "djep-profile-group";

      if (titleText) {
        const title = document.createElement("h3");
        title.className = "djep-profile-group-title";
        title.textContent = titleText;
        group.append(title);
      }

      const body = document.createElement("div");
      body.className = "djep-profile-group-body";
      group.append(body);
      wrapper.append(group);
      currentBody = body;
      return body;
    };

    const appendCellNodes = (cell, target) => {
      const radioLabels = Array.from(cell.querySelectorAll(":scope > label")).filter((label) =>
        label.querySelector('input[type="radio"]')
      );

      if (radioLabels.length > 1) {
        radioLabels.forEach((label) => {
          const slot = document.createElement("div");
          slot.className = "djep-profile-control-slot";
          slot.append(label);
          target.append(slot);
        });
        return;
      }

      const slot = document.createElement("div");
      slot.className = "djep-profile-control-slot";

      Array.from(cell.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && !cleanText(node.textContent)) return;
        slot.append(node);
      });

      slot.querySelectorAll("input, select, textarea").forEach((control) => {
        control.style.width = "";
      });

      if (slot.childNodes.length) {
        target.append(slot);
      }
    };

    Array.from(table.querySelectorAll("tr")).forEach((row) => {
      const sectionCell = row.querySelector(".djep-sectiontitle");
      if (sectionCell) {
        if (collapseGroups || singleGroupTitle) {
          if (!singleGroupInitialized) {
            ensureGroup(singleGroupTitle);
            singleGroupInitialized = true;
          }
          return;
        }

        ensureGroup(cleanText(sectionCell.textContent));
        return;
      }

      const cells = Array.from(row.cells || []);
      if (!cells.length || row.id === "spacer_row") return;

      const hasInteractiveContent = !!row.querySelector(
        "input, select, textarea, button, a, label, .djep-titlebarconfirm"
      );
      const rowText = cleanText(row.textContent);

      if (!hasInteractiveContent && !rowText) return;
      if (!currentBody) {
        ensureGroup(singleGroupTitle || options.defaultGroupTitle || "");
        if (collapseGroups || singleGroupTitle) singleGroupInitialized = true;
      }

      const firstCell = cells[0];
      const isWideRow = cells.length === 1 || (firstCell && (firstCell.colSpan || 1) > 1);

      if (isWideRow) {
        const wideRow = document.createElement("div");
        wideRow.className = row.querySelector(".djep-titlebarconfirm")
          ? "djep-profile-confirmation-row"
          : "djep-profile-action-row";
        if (row.id) wideRow.id = row.id;
        wideRow.style.display = row.style.display || "";

        Array.from(firstCell.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && !cleanText(node.textContent)) return;
          wideRow.append(node);
        });

        currentBody.append(wideRow);
        return;
      }

      const labelText = cleanText(firstCell.textContent).replace(/:$/, "");
      if (!labelText || labelText.toLowerCase() === "hidden" || hiddenLabels.has(labelText.toLowerCase())) return;

      const field = document.createElement("div");
      field.className = "djep-profile-field";
      if (row.id) field.id = row.id;
      field.style.display = row.style.display || "";

      const label = document.createElement("div");
      label.className = "djep-profile-field-label";
      label.textContent = labelText;

      const hasControls = cells.slice(1).some((cell) =>
        cell.querySelector("input, select, textarea, a, button, label")
      );

      let value;
      if (hasControls) {
        value = document.createElement("div");
        value.className = "djep-profile-field-controls";

        cells.slice(1).forEach((cell) => appendCellNodes(cell, value));

        if (value.querySelector('input[type="radio"]')) {
          value.classList.add("is-choice");
        }

        if (value.children.length > 1) {
          value.style.setProperty("--djep-profile-control-columns", String(value.children.length));
        }
      } else {
        value = document.createElement("div");
        value.className = "djep-profile-field-value";
        const valueText = cleanText(cells.slice(1).map((cell) => cell.textContent || "").join(" "));

        if (!valueText && hideEmptyDisplayRows) return;

        if (valueText) {
          value.textContent = valueText;
        } else {
          value.textContent = "";
          value.classList.add("is-empty");
        }
      }

      field.append(label, value);
      currentBody.append(field);
    });

    return wrapper;
  }

  function buildContactInfoList(table) {
    if (!table) return null;

    const labelMap = {
      telephone: "Phone",
      email: "Email",
      mail: "Mailing Address",
      website: "Website"
    };

    const list = document.createElement("div");
    list.className = "djep-contact-info-list";

    Array.from(table.querySelectorAll("tr")).forEach((row) => {
      const cells = Array.from(row.cells || []);
      if (cells.length < 2) return;

      const iconCell = cells[0];
      const valueCell = cells[1];
      const kind = (iconCell.id || "").replace("djep-contact", "");

      const item = document.createElement("div");
      item.className = "djep-contact-info-item";

      const iconWrap = document.createElement("div");
      iconWrap.className = "djep-contact-info-icon";
      const icon = iconCell.querySelector("img");
      if (icon) {
        icon.removeAttribute("width");
        icon.removeAttribute("height");
        iconWrap.append(icon);
      }

      const body = document.createElement("div");
      body.className = "djep-contact-info-body";

      const label = document.createElement("div");
      label.className = "djep-contact-info-label";
      label.textContent = labelMap[kind] || "Contact";

      const value = document.createElement("div");
      value.className = "djep-contact-info-value";
      if (kind === "telephone") {
        const phoneText = cleanText(valueCell.textContent);
        const phoneHref = phoneText.replace(/[^\d+]/g, "");

        if (phoneText && phoneHref) {
          const phoneLink = document.createElement("a");
          phoneLink.href = `tel:${phoneHref}`;
          phoneLink.textContent = phoneText;
          value.append(phoneLink);
        } else {
          Array.from(valueCell.childNodes).forEach((node) => value.append(node));
        }
      } else if (kind === "mail") {
        value.textContent = normalizeMailingAddressText(valueCell.innerHTML.replace(/<br\s*\/?>/gi, "\n"));
      } else {
        Array.from(valueCell.childNodes).forEach((node) => value.append(node));
      }

      body.append(label, value);
      item.append(iconWrap, body);
      list.append(item);
    });

    return list.childNodes.length ? list : null;
  }

  function extractEventCardData(card) {
    const hiddenInfo = card.querySelector(".hidden_event_information");
    const infoCell = card.querySelector("table tr td:last-child");
    const infoLines = extractKeyValueLines(infoCell?.innerHTML || "");
    const rawText = cleanText(card.textContent || "");
    const matchLine = (label, nextLabels = []) => {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedNext = nextLabels
        .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
      const pattern = escapedNext
        ? new RegExp(`${escapedLabel}:\\s*(.+?)(?=(?:${escapedNext}):|$)`, "i")
        : new RegExp(`${escapedLabel}:\\s*(.+)$`, "i");
      const match = rawText.match(pattern);
      return cleanText(match?.[1] || "");
    };
    const planButton = card.querySelector(".djep-planeventbutton");
    const detailsButton = card.querySelector(".djep-eventdetailsbutton");
    const paymentButton = card.querySelector(".djep-paymentbutton");
    const calendar = card.querySelector(".calendar");

    const eventDateText =
      cleanText(hiddenInfo?.querySelector('[class^="event_date_"]')?.textContent) ||
      cleanText(card.querySelector(".calendar .month")?.textContent) ||
      "";
    const eventName = cleanText(hiddenInfo?.querySelector('[class^="event_name_"]')?.textContent);
    const eventDate = parseSlashDate(eventDateText);
    const eventType = infoLines["event type"] || matchLine("Event Type", ["Package", "Booking Status"]) || "";
    const packageName = infoLines["package"] || matchLine("Package", ["Booking Status"]) || "";
    const bookingStatus =
      infoLines["booking status"] ||
      cleanText(hiddenInfo?.querySelector('[class^="event_status_"]')?.textContent) ||
      matchLine("Booking Status");

    return {
      hiddenInfo,
      planButton,
      detailsButton,
      paymentButton,
      calendar,
      eventDate,
      eventName,
      eventType,
      packageName,
      bookingStatus,
      summaryTitle: eventName || eventType || packageName || "Event"
    };
  }

  function applyPageHeadingSubtitle(heading, titleText, subtitleClassName, subtitleText) {
    if (!(heading instanceof HTMLElement) || heading.querySelector(`.${subtitleClassName}`)) return;

    const textNodes = Array.from(heading.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    if (textNodes.length) {
      textNodes[0].textContent = titleText;
    } else {
      heading.insertBefore(document.createTextNode(titleText), heading.firstChild);
    }

    const subtitle = document.createElement("span");
    subtitle.className = subtitleClassName;
    subtitle.textContent = subtitleText;
    heading.append(subtitle);
  }

  function buildHomeEventShell(eventData) {
    const {
      planButton,
      detailsButton,
      paymentButton,
      calendar,
      eventDate,
      eventName,
      eventType,
      packageName,
      bookingStatus,
      summaryTitle
    } = eventData;

    const intro = document.createElement("div");
    intro.className = "djep-home-event-intro";
    intro.textContent = "Upcoming Event";

    const shell = document.createElement("div");
    shell.className = "djep-home-event-shell";

    const contentBlock = document.createElement("div");
    contentBlock.className = "djep-home-event-content";

    const meta = document.createElement("div");
    meta.className = "djep-home-event-meta";

    const shortDate = formatShortDate(eventDate);
    if (shortDate) meta.append(createMetaChip("Date", shortDate));
    if (eventType) meta.append(createMetaChip("Type", eventType));
    if (bookingStatus) meta.append(createMetaChip("Status", bookingStatus));

    const homeTitle = eventName || packageName || eventType || summaryTitle;

    const title = document.createElement("h3");
    title.className = "djep-home-event-title";
    title.textContent = homeTitle;

    const details = document.createElement("div");
    details.className = "djep-home-event-details";
    details.append(title);

    if (meta.children.length) {
      details.append(meta);
    }

    const dateWrap = document.createElement("div");
    dateWrap.className = "djep-home-event-date";
    if (calendar) {
      dateWrap.append(calendar);
    }

    const body = document.createElement("div");
    body.className = "djep-home-event-body";
    body.append(dateWrap, details);

    contentBlock.append(intro, body);

    const actions = document.createElement("div");
    actions.className = "djep-home-event-actions";

    if (planButton) {
      planButton.textContent = "Plan My Event";
      planButton.classList.add("djep-home-event-primary");
      actions.append(planButton);
    }

    if (detailsButton) {
      detailsButton.textContent = "Event Details";
      detailsButton.classList.add("djep-home-event-secondary");
      actions.append(detailsButton);
    }

    if (paymentButton) {
      paymentButton.textContent = "Make a Payment";
      paymentButton.classList.add("djep-home-event-primary");
      actions.append(paymentButton);
    }

    shell.append(contentBlock, actions);
    return shell;
  }

  function buildHomeWelcomeShell(welcomeBox) {
    if (!(welcomeBox instanceof HTMLElement)) return null;

    const welcomeStyle = welcomeBox.querySelector(":scope > style");
    const welcomeContent = welcomeBox.querySelector(":scope > .portal-welcome") || welcomeBox.querySelector(".portal-welcome");

    const styleText = cleanText(welcomeStyle?.textContent || "");
    if (styleText) {
      upsertRuntimeStyle("djep-home-welcome-runtime", welcomeStyle.textContent.trim());
    }

    if (welcomeContent instanceof HTMLElement) {
      const shell = welcomeContent.cloneNode(true);
      shell.classList.add("djep-home-welcome-shell");
      return shell;
    }

    const fallback = document.createElement("section");
    fallback.className = "djep-home-welcome-shell";
    Array.from(welcomeBox.childNodes).forEach((node) => {
      if (node === welcomeStyle) return;
      fallback.append(node.cloneNode(true));
    });
    return fallback.childNodes.length ? fallback : null;
  }

  function buildHomeEventsPanel(eventListBox) {
    if (!(eventListBox instanceof HTMLElement)) return null;

    const panel = document.createElement("section");
    panel.className = "djep-home-events-panel";

    eventListBox.querySelectorAll(".djep-singleeventdiv").forEach((card) => {
      if (card.dataset.djepHomeCardInit !== "1") {
        card.dataset.djepHomeCardInit = "1";
        card.classList.add("djep-home-event-card");

        const eventData = extractEventCardData(card);
        const shell = buildHomeEventShell(eventData);
        replaceEventCardContents(card, eventData.hiddenInfo, shell);
      }

      panel.append(card);
    });

    return panel.children.length ? panel : null;
  }

  function mountHomeWorkspace(content, { welcomeShell, eventPanels }) {
    if (!(content instanceof HTMLElement)) return;

    const workspace = document.createElement("div");
    workspace.className = "djep-home-content";

    if (welcomeShell instanceof HTMLElement) {
      workspace.append(welcomeShell);
    }

    eventPanels.forEach((panel) => {
      if (panel instanceof HTMLElement) {
        workspace.append(panel);
      }
    });

    content.replaceChildren(workspace);
  }

  function buildEventsEventShell(eventData) {
    const {
      planButton,
      detailsButton,
      paymentButton,
      calendar,
      eventDate,
      eventName,
      eventType,
      packageName,
      bookingStatus,
      summaryTitle
    } = eventData;

    const eventsTitle = eventName || packageName || eventType || summaryTitle;

    const shell = document.createElement("div");
    shell.className = "djep-events-event-shell";

    const dateWrap = document.createElement("div");
    dateWrap.className = "djep-events-event-date";
    if (calendar) {
      dateWrap.append(calendar);
    }

    const contentBlock = document.createElement("div");
    contentBlock.className = "djep-events-event-content";

    const title = document.createElement("h3");
    title.className = "djep-events-event-title";
    title.textContent = eventsTitle;
    contentBlock.append(title);

    const meta = document.createElement("div");
    meta.className = "djep-events-event-meta";

    const shortDate = formatShortDate(eventDate);
    if (shortDate) meta.append(createMetaChip("Date", shortDate));
    if (eventType) meta.append(createMetaChip("Type", eventType));
    if (bookingStatus) meta.append(createMetaChip("Status", bookingStatus));
    if (meta.children.length) {
      contentBlock.append(meta);
    }

    const actions = document.createElement("div");
    actions.className = "djep-events-event-actions";

    if (planButton) {
      planButton.textContent = "Plan My Event";
      actions.append(planButton);
    }

    if (detailsButton) {
      detailsButton.textContent = "Event Details";
      detailsButton.classList.add("djep-events-event-secondary");
      actions.append(detailsButton);
    }

    if (paymentButton) {
      paymentButton.textContent = "Make a Payment";
      actions.append(paymentButton);
    }

    shell.append(dateWrap, contentBlock, actions);
    return shell;
  }

  function buildEventsSection(eventListBox) {
    if (!(eventListBox instanceof HTMLElement)) return null;

    const section = document.createElement("section");
    section.className = "djep-events-section";

    const titlebar = eventListBox.querySelector(":scope > .djep-titlebar");
    const sectionTitle = cleanText(titlebar?.textContent || "");
    if (sectionTitle) {
      const title = document.createElement("p");
      title.className = "djep-events-section-title";
      title.textContent = sectionTitle;
      section.append(title);
    }

    const sectionBody = document.createElement("div");
    sectionBody.className = "djep-events-section-body";

    const eventCards = Array.from(eventListBox.querySelectorAll(".djep-singleeventdiv"));
    if (eventCards.length) {
      eventCards.forEach((card) => {
        const nextCard = document.createElement("div");
        nextCard.className = "djep-events-event-card";
        const eventData = extractEventCardData(card);
        const shell = buildEventsEventShell(eventData);
        replaceEventCardContents(nextCard, eventData.hiddenInfo, shell);
        sectionBody.append(nextCard);
      });
    } else {
      const bodyText = cleanText(
        Array.from(eventListBox.childNodes)
          .filter((node) => node !== titlebar)
          .map((node) => node.textContent || "")
          .join(" ")
      );

      const emptyState = document.createElement("div");
      emptyState.className = "djep-events-empty-state";
      emptyState.textContent =
        bodyText && bodyText.toLowerCase() !== "none found"
          ? bodyText
          : sectionTitle.toLowerCase().includes("past")
            ? "No past events found."
            : "No upcoming events found.";
      sectionBody.append(emptyState);
    }

    section.append(sectionBody);
    return section;
  }

  function mountEventsWorkspace(content, { heading, sections }) {
    if (!(content instanceof HTMLElement)) return;

    const root = document.createElement("div");
    root.id = "page_eventslist";
    root.className = "djep-eventslist-root";

    if (heading instanceof HTMLElement) {
      root.append(heading);
    }

    sections.forEach((section) => {
      if (section instanceof HTMLElement) {
        root.append(section);
      }
    });

    content.replaceChildren(root);
    content.classList.add("djep-events-content");
  }

  function replaceEventCardContents(card, hiddenInfo, shell) {
    Array.from(card.children).forEach((child) => child.remove());
    if (hiddenInfo) {
      card.append(hiddenInfo);
    }
    card.append(shell);
  }

  function addPanelNotes(panels, noteClassName, panelNotes) {
    panels.forEach((panel) => {
      const titlebar = panel.querySelector(":scope > .djep-titlebarsmall");
      if (!titlebar || titlebar.nextElementSibling?.classList?.contains(noteClassName)) return;

      const noteText = panelNotes.get(cleanText(titlebar.textContent));
      if (!noteText) return;

      const note = document.createElement("p");
      note.className = noteClassName;
      note.textContent = noteText;
      titlebar.insertAdjacentElement("afterend", note);
    });
  }

  function cleanupWorkspaceColumns(columns, selectors) {
    columns.forEach((column) => {
      column?.querySelectorAll(selectors).forEach((node) => node.remove());
    });
  }

  function cleanEmptyContainerNodes(root, selectors) {
    root?.querySelectorAll(selectors).forEach((node) => node.remove());
  }

  function normalizePlanPageHeading(heading, { eventDate, eventDateText, focusTitle, longEventDate }) {
    if (!(heading instanceof HTMLElement) || heading.dataset.djepPlanHeadingInit) return;
    heading.dataset.djepPlanHeadingInit = "1";

    const detailsButton = heading.querySelector(".djep-eventdetailsbutton");
    if (detailsButton) {
      detailsButton.textContent = "Event Details";
      detailsButton.classList.add("djep-plan-header-button");
    }

    Array.from(heading.childNodes).forEach((node) => {
      if (node !== detailsButton) {
        node.remove();
      }
    });

    const titleNode = document.createElement("span");
    titleNode.className = "djep-plan-title";
    titleNode.textContent = "Plan My Event";
    if (detailsButton) {
      heading.insertBefore(titleNode, detailsButton);
    } else {
      heading.append(titleNode);
    }

    const meta = document.createElement("div");
    meta.className = "djep-plan-meta";
    if (eventDateText) {
      meta.append(createMetaChip("Date", formatShortDate(eventDate) || eventDateText));
    }
    if (focusTitle) {
      meta.append(createMetaChip("Focus", focusTitle));
    }
    if (meta.children.length) {
      heading.append(meta);
    }

    const subtitle = document.createElement("div");
    subtitle.className = "djep-plan-subtitle";
    subtitle.textContent = longEventDate
      ? `Access music, forms, timeline, and print tools for ${longEventDate}.`
      : "Access music, forms, timeline, and print tools for this event.";
    heading.append(subtitle);
  }

  function setPlanPageSectionTitles(sectionMap) {
    const setTitlebarText = (box, text) => {
      const titlebar = box?.querySelector(":scope > .djep-titlebar");
      if (!titlebar) return;
      titlebar.textContent = text;
    };

    sectionMap.forEach(([box, text]) => setTitlebarText(box, text));
  }

  function enhancePlanList(box, noteText) {
    if (!box) return;

    box.querySelectorAll("table tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 3) return;

      const titleCell = cells[1];
      if (!titleCell.querySelector(".djep-plan-entry-copy")) {
        const titleText = cleanText(titleCell.textContent || "");
        titleCell.textContent = "";

        const copy = document.createElement("div");
        copy.className = "djep-plan-entry-copy";

        const title = document.createElement("div");
        title.className = "djep-plan-entry-title";
        title.textContent = titleText;

        copy.append(title);

        if (noteText) {
          const note = document.createElement("div");
          note.className = "djep-plan-entry-note";
          note.textContent = noteText;
          copy.append(note);
        }

        titleCell.append(copy);
      }

      const buttons = Array.from(cells[2].querySelectorAll(".djep-readviewbutton"));
      const editButton = buttons.find((button) => /edit/i.test(button.textContent || ""));
      if (editButton) {
        editButton.classList.add("djep-plan-primary-button");
      }
    });
  }

  function normalizePlanningFormsEditHeading(pageHeading, formTitle) {
    if (!(pageHeading instanceof HTMLElement) || pageHeading.dataset.djepPlanningFormHeadingInit) return;
    pageHeading.dataset.djepPlanningFormHeadingInit = "1";
    pageHeading.classList.add("djep-planningform-heading");

    const optionsButton = pageHeading.querySelector(".djep-planeventbutton");
    if (optionsButton && !optionsButton.dataset.djepLabelNormalized) {
      optionsButton.dataset.djepLabelNormalized = "1";
      optionsButton.textContent = "Planning Options";
    }

    Array.from(pageHeading.childNodes).forEach((node) => {
      if (node !== optionsButton) node.remove();
    });

    const title = document.createElement("span");
    title.className = "djep-planningform-title";
    title.textContent = "Planning Form";

    if (optionsButton) {
      pageHeading.insertBefore(title, optionsButton);
    } else {
      pageHeading.append(title);
    }

    const subtitle = document.createElement("div");
    subtitle.className = "djep-planningform-subtitle";
    subtitle.textContent = `Review and update the details for ${formTitle}.`;
    pageHeading.append(subtitle);
  }

  function normalizePlanningFormsLandingHeading(pageHeading) {
    if (!(pageHeading instanceof HTMLElement) || pageHeading.dataset.djepPlanningFormsLandingHeadingInit) return;
    pageHeading.dataset.djepPlanningFormsLandingHeadingInit = "1";
    pageHeading.classList.add("djep-planningformslanding-heading");

    const optionsButton = pageHeading.querySelector(".djep-planeventbutton");
    if (optionsButton && !optionsButton.dataset.djepLabelNormalized) {
      optionsButton.dataset.djepLabelNormalized = "1";
      optionsButton.textContent = "Planning Options";
    }

    Array.from(pageHeading.childNodes).forEach((node) => {
      if (node !== optionsButton) node.remove();
    });

    const title = document.createElement("span");
    title.className = "djep-planningformslanding-title";
    title.textContent = "Planning Forms";

    if (optionsButton) {
      pageHeading.insertBefore(title, optionsButton);
    } else {
      pageHeading.append(title);
    }

    const subtitle = document.createElement("div");
    subtitle.className = "djep-planningformslanding-subtitle";
    subtitle.textContent = "Choose the worksheet you want to edit or preview for this event.";
    pageHeading.append(subtitle);
  }

  function bindPaymentAmountValidation(form) {
    if (!(form instanceof HTMLElement) || form.dataset.djepAmountValidationBound === "1") return;
    form.dataset.djepAmountValidationBound = "1";

    form.addEventListener("submit", (event) => {
      const amountInput = form.querySelector("#amountdollars");
      const amountValue = (amountInput?.value || "").trim();
      if (!amountInput || amountValue) return;

      event.preventDefault();
      amountInput.setCustomValidity("Please enter a payment amount.");
      amountInput.reportValidity();
      amountInput.focus();
    });

    form.addEventListener("input", (event) => {
      if (event.target?.id !== "amountdollars") return;
      event.target.setCustomValidity("");
    });
  }

  function mountPaymentHeadingSubtitle({ root, form, heading, isAmountStep }) {
    if (!(heading instanceof HTMLElement)) return;

    heading.querySelectorAll(".djep-payment-subtitle").forEach((node) => node.remove());
    root?.querySelectorAll(":scope > .djep-payment-subtitle").forEach((node) => node.remove());
    form?.querySelectorAll(":scope > .djep-payment-subtitle").forEach((node) => node.remove());

    const subtitle = document.createElement("p");
    subtitle.className = "djep-payment-subtitle";
    subtitle.textContent = isAmountStep
      ? "Choose your payment method, enter the amount you want to pay, and continue securely to checkout."
      : "Review your payment options and billing details to complete checkout securely.";
    heading.insertAdjacentElement("afterend", subtitle);
  }

  function parsePaymentGatewayDetails(gatewayNotes) {
    if (!(gatewayNotes instanceof HTMLElement)) return null;

    const notesClone = gatewayNotes.cloneNode(true);
    notesClone
      .querySelectorAll("title, style, script, #submit_payment_button_row, .metro-button")
      .forEach((node) => node.remove());

    const links = Array.from(notesClone.querySelectorAll("a[href]")).map((link) => {
      const image = link.querySelector("img");
      return {
        href: link.getAttribute("href") || link.href || "",
        alt: image?.getAttribute("alt") || "",
        src: image?.getAttribute("src") || "",
      };
    });

    const text = cleanText(notesClone.textContent);
    const addressMatch = text.match(/Mailing Address:\s*(.+)$/i);
    const addressText = addressMatch ? cleanText(addressMatch[1]) : "";
    const introText = addressMatch ? cleanText(text.slice(0, addressMatch.index)) : text;
    const warningMatch = introText.match(/Please note,[^.]+\./i);
    const warningText = warningMatch ? cleanText(warningMatch[0]) : "";
    const detailText = cleanText(introText.replace(warningText, ""));

    return {
      addressText,
      detailText,
      links,
      warningText,
    };
  }

  function derivePaymentGatewayDetailsFromAltBox(altBox) {
    if (!(altBox instanceof HTMLElement)) return null;

    const existingLinks = Array.from(altBox.querySelectorAll(".djep-payment-altlink[href]")).map((link) => {
      const image = link.querySelector("img");
      return {
        href: link.getAttribute("href") || link.href || "",
        alt: image?.getAttribute("alt") || cleanText(link.textContent || ""),
        src: image?.getAttribute("src") || "",
      };
    });
    const existingAddress = cleanText(
      (altBox.querySelector(".djep-payment-mailing")?.textContent || "").replace(/^Mailing Address:\s*/i, "")
    );

    return {
      addressText: existingAddress,
      detailText: "",
      links: existingLinks,
      warningText: "",
    };
  }

  function rebuildPaymentAmountEntryInner(inner) {
    if (!(inner instanceof HTMLElement) || inner.classList.contains("djep-payment-rebuilt")) return null;

    const balanceLabelCell = inner.querySelector("#text_balancedue")?.closest(".col-xs-6");
    const balanceValueCell = balanceLabelCell?.nextElementSibling;
    const amountLabelCell = inner.querySelector("#text_enteramount")?.closest(".col-xs-6");
    const amountValueCell = inner.querySelector("#payment_amount")?.closest(".col-xs-6");
    const submitLabelCell = inner.querySelector("#text_paynow")?.closest(".col-xs-6");
    const submitValueCell = submitLabelCell?.nextElementSibling;
    const amountInput = inner.querySelector("#amountdollars");
    const submitButton = inner.querySelector('button[type="submit"], .djep-actionbutton');
    const totalAfter = inner.querySelector("#total_after_charges");

    if (
      !balanceLabelCell ||
      !balanceValueCell ||
      !amountLabelCell ||
      !amountValueCell ||
      !submitLabelCell ||
      !submitValueCell ||
      !amountInput ||
      !submitButton
    ) {
      return null;
    }

    const balanceAmount = cleanText(balanceValueCell.textContent) || "$0.00";

    inner.querySelectorAll(':scope > .cf, :scope > div[style*="height"], :scope > .form-group').forEach((node) => node.remove());

    const summaryCard = document.createElement("section");
    summaryCard.className = "djep-payment-card djep-payment-summary-card";

    const summaryLabel = document.createElement("span");
    summaryLabel.className = "djep-payment-card-label";
    summaryLabel.textContent = "Current Balance Due";

    const summaryValue = document.createElement("div");
    summaryValue.className = "djep-payment-balance-value";
    summaryValue.textContent = balanceAmount;
    summaryCard.append(summaryLabel, summaryValue);

    const amountCard = document.createElement("section");
    amountCard.className = "djep-payment-card djep-payment-amount-card";

    const amountLabel = document.createElement("span");
    amountLabel.className = "djep-payment-card-label";
    amountLabel.textContent = "Enter a Payment Amount";

    const amountCopy = document.createElement("p");
    amountCopy.className = "djep-payment-card-copy";
    amountCopy.textContent =
      "Enter the amount you want to pay today. You can review the total before continuing.";

    const amountField = document.createElement("div");
    amountField.className = "djep-payment-amount-field";

    const currency = document.createElement("span");
    currency.className = "djep-payment-currency";
    currency.textContent = "$";

    amountInput.removeAttribute("size");
    amountInput.setAttribute("inputmode", "decimal");
    amountInput.setAttribute("placeholder", "0.00");

    amountField.append(currency, amountInput);
    amountCard.append(amountLabel, amountCopy, amountField);

    if (totalAfter) {
      const charges = document.createElement("div");
      charges.className = "djep-payment-total-after";
      charges.append(totalAfter);
      amountCard.append(charges);
    }

    const actionCard = document.createElement("section");
    actionCard.className = "djep-payment-card djep-payment-submit-card";

    const actionLabel = document.createElement("span");
    actionLabel.className = "djep-payment-card-label";
    actionLabel.textContent = "Continue to Payment Details";

    const actionCopy = document.createElement("p");
    actionCopy.className = "djep-payment-card-copy";
    actionCopy.textContent =
      "Continue to the secure card entry screen to finish your payment.";

    actionCard.append(actionLabel, actionCopy, submitButton);

    inner.innerHTML = "";
    inner.classList.add("djep-payment-rebuilt");
    inner.append(summaryCard, amountCard, actionCard);

    return { summaryCard, amountCard, actionCard };
  }

  function ensurePaymentWorkspace(form) {
    if (!(form instanceof HTMLElement)) {
      return { workspace: null, mainColumn: null, sideColumn: null };
    }

    let workspace = form.querySelector(".djep-payment-workspace");
    let mainColumn = workspace?.querySelector(".djep-payment-column-main");
    let sideColumn = workspace?.querySelector(".djep-payment-column-side");

    if (!workspace) {
      workspace = document.createElement("div");
      workspace.className = "djep-payment-workspace";
      mainColumn = document.createElement("div");
      mainColumn.className = "djep-payment-column djep-payment-column-main";
      sideColumn = document.createElement("div");
      sideColumn.className = "djep-payment-column djep-payment-column-side";
      workspace.append(mainColumn, sideColumn);
    }

    return { workspace, mainColumn, sideColumn };
  }

  function mountPaymentWorkspace(form, heading, workspace) {
    if (!(form instanceof HTMLElement) || !(workspace instanceof HTMLElement) || form.contains(workspace)) return;

    const anchor =
      heading?.nextElementSibling?.classList?.contains("djep-payment-subtitle") ? heading.nextElementSibling : heading;
    if (anchor && anchor.parentElement === form) {
      anchor.insertAdjacentElement("afterend", workspace);
    } else {
      form.insertBefore(workspace, form.firstChild);
    }
  }

  function cleanupPaymentContentRoot(content, root) {
    if (!(content instanceof HTMLElement) || !(root instanceof HTMLElement) || root.parentElement !== content) return;

    root.classList.remove("payment_page_div", "djep-payment_page_div");
    root.classList.add("djep-payment-root");

    const form = root.querySelector(":scope > form");
    const heading = root.querySelector(":scope > h2.djep-h2");
    const subtitle = root.querySelector(":scope > .djep-payment-subtitle");

    if (form instanceof HTMLElement) {
      root.querySelectorAll(':scope > input[type="hidden"]').forEach((input) => {
        form.append(input);
      });
    }

    const nextRootChildren = [];
    if (heading instanceof HTMLElement) nextRootChildren.push(heading);
    if (subtitle instanceof HTMLElement) nextRootChildren.push(subtitle);
    if (form instanceof HTMLElement) nextRootChildren.push(form);
    if (nextRootChildren.length) {
      root.replaceChildren(...nextRootChildren);
    }

    const footer = content.querySelector(":scope > #footer");
    const nextChildren = [root];
    if (footer instanceof HTMLElement) {
      nextChildren.push(footer);
    }
    content.replaceChildren(...nextChildren);
  }

  function initializePaymentBillingAddressSection({ form, billingBox, altAddress }) {
    if (!(form instanceof HTMLElement) || !(billingBox instanceof HTMLElement) || !(altAddress instanceof HTMLElement)) return;

    const zipInput = altAddress.querySelector('input[name="address_zip"]');

    const forceAltAddressWidths = () => {
      altAddress.querySelectorAll(".col-xs-12.col-sm-6").forEach((node) => {
        node.style.width = "100%";
        node.style.maxWidth = "none";
        node.style.float = "none";
        node.style.paddingLeft = "0";
        node.style.paddingRight = "0";
      });

      altAddress.querySelectorAll(".col-xs-12.col-sm-3, .col-xs-12.col-sm-9").forEach((node) => {
        node.style.width = "100%";
        node.style.maxWidth = "none";
        node.style.float = "none";
        node.style.paddingLeft = "0";
        node.style.paddingRight = "0";
      });

      altAddress.querySelectorAll(".address_padding").forEach((node) => {
        node.style.width = "100%";
        node.style.maxWidth = "none";
        node.style.padding = "0 0 8px";
        node.style.display = "block";
      });

      altAddress
        .querySelectorAll('input[name^="address_"], select[name="address_country"], textarea[name^="address_"]')
        .forEach((node) => {
          node.style.width = "100%";
          node.style.maxWidth = "none";
          node.style.display = "block";
          node.style.boxSizing = "border-box";
        });
    };

    const normalizeAltAddressLayout = () => {
      const needsNormalization =
        !altAddress.querySelector(".djep-payment-alt-address-fields") || Boolean(altAddress.querySelector(".address_padding"));

      if (!needsNormalization) return;

      const titlebar = altAddress.querySelector(":scope > .djep-titlebar");
      const labels = Array.from(altAddress.querySelectorAll(".address_padding"))
        .map((node) => cleanText(node.textContent || ""))
        .filter(Boolean);
      const controls = Array.from(altAddress.querySelectorAll("input, select, textarea")).filter(
        (node) => !["hidden", "radio", "checkbox"].includes((node.getAttribute("type") || "").toLowerCase())
      );

      if (labels.length && controls.length) {
        const rowsHost = document.createElement("div");
        rowsHost.className = "djep-payment-alt-address-fields";

        labels.forEach((labelText, index) => {
          const control = controls[index];
          if (!control) return;

          const row = document.createElement("div");
          row.className = "djep-payment-alt-row";

          const label = document.createElement("label");
          label.className = "djep-payment-alt-label";
          label.textContent = labelText;

          if (!control.id) {
            control.id = `djep-alt-address-${index + 1}`;
          }
          label.setAttribute("for", control.id);

          const controlWrap = document.createElement("div");
          controlWrap.className = "djep-payment-alt-control";
          control.classList.add("djep-payment-alt-input");
          controlWrap.append(control);

          row.append(label, controlWrap);
          rowsHost.append(row);
        });

        altAddress.querySelectorAll(":scope > :not(.djep-titlebar)").forEach((node) => node.remove());
        if (titlebar) {
          altAddress.append(rowsHost);
        } else {
          altAddress.prepend(rowsHost);
        }
        altAddress.dataset.djepNormalized = "1";
      }

      forceAltAddressWidths();
    };

    const defaultAddressRadio = billingBox.querySelector("#use_profile_address");
    const newAddressRadio = billingBox.querySelector("#use_new_address");

    const syncBillingAddressVisibility = () => {
      normalizeAltAddressLayout();
      forceAltAddressWidths();
      const shouldShow = Boolean(newAddressRadio?.checked) && !Boolean(defaultAddressRadio?.checked);
      altAddress.style.display = shouldShow ? "block" : "none";
      altAddress.hidden = !shouldShow;
      altAddress.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      altAddress.classList.toggle("is-open", shouldShow);
      if (zipInput) {
        zipInput.required = shouldShow;
        if (!shouldShow) {
          zipInput.setCustomValidity("");
        }
      }
    };

    const validateBillingZipRequirement = () => {
      if (!zipInput || !newAddressRadio?.checked || Boolean(defaultAddressRadio?.checked)) {
        zipInput?.setCustomValidity("");
        return true;
      }
      const zipValue = String(zipInput.value || "").trim();
      if (zipValue) {
        zipInput.setCustomValidity("");
        return true;
      }
      zipInput.setCustomValidity("Please enter a billing ZIP code.");
      zipInput.reportValidity();
      zipInput.focus();
      return false;
    };

    billingBox.querySelectorAll('input[name="billing_address"]').forEach((input) => {
      if (input.dataset.djepBillingBound === "1") return;
      input.dataset.djepBillingBound = "1";
      input.addEventListener("change", syncBillingAddressVisibility);
      input.addEventListener("click", syncBillingAddressVisibility);
    });

    if (zipInput && zipInput.dataset.djepZipBound !== "1") {
      zipInput.dataset.djepZipBound = "1";
      zipInput.addEventListener("input", () => {
        zipInput.setCustomValidity("");
      });
      zipInput.addEventListener("change", () => {
        zipInput.setCustomValidity("");
      });
    }

    if (form.dataset.djepBillingZipValidationBound !== "1") {
      form.dataset.djepBillingZipValidationBound = "1";
      form.addEventListener(
        "submit",
        (event) => {
          if (validateBillingZipRequirement()) return;
          event.preventDefault();
        },
        true
      );
    }

    syncBillingAddressVisibility();
    window.setTimeout(syncBillingAddressVisibility, 0);
    window.setTimeout(syncBillingAddressVisibility, 120);
    window.setTimeout(syncBillingAddressVisibility, 400);
    window.setTimeout(syncBillingAddressVisibility, 900);

    const billingObserver = new MutationObserver(() => {
      forceAltAddressWidths();
      if (altAddress.querySelector(".address_padding")) {
        normalizeAltAddressLayout();
      }
    });
    billingObserver.observe(altAddress, { childList: true, subtree: true });
  }

  function bindPaymentSubmitRecovery({ form, submitRow, errorBox, mainCard, cardholderName }) {
    if (!(form instanceof HTMLElement)) return;

    const submitButton = submitRow?.querySelector('button[type="submit"], input[type="submit"]');
    const getSubmitButtonLabel = () => {
      if (!submitButton) return "";
      if (submitButton instanceof HTMLInputElement) {
        return submitButton.value || "";
      }
      return submitButton.textContent || "";
    };
    const setSubmitButtonLabel = (label) => {
      if (!submitButton) return;
      if (submitButton instanceof HTMLInputElement) {
        submitButton.value = label;
        return;
      }
      submitButton.textContent = label;
    };
    const rememberSubmitButtonLabel = () => {
      if (!submitButton) return;
      const currentLabel = cleanText(getSubmitButtonLabel());
      if (!currentLabel || /processing/i.test(currentLabel)) return;
      submitButton.dataset.djepOriginalLabel = currentLabel;
    };
    const getStoredSubmitButtonLabel = () =>
      submitButton?.dataset.djepOriginalLabel || submitButton?.getAttribute("data-originalvalue") || "Pay Now";
    const hasBlockingPaymentError = () => {
      const hasCardholderError = Boolean(cardholderName) && !String(cardholderName.value || "").trim();
      const errorText = cleanText(errorBox?.textContent || "");
      const hasStripeFieldError = Boolean(
        mainCard?.querySelector(".StripeElement--invalid, .StripeElement--empty.invalid, .invalid")
      );
      return hasCardholderError || Boolean(errorText) || hasStripeFieldError;
    };
    const restoreSubmitButtonIfBlocked = () => {
      if (!submitButton) return;
      const currentLabel = cleanText(getSubmitButtonLabel());
      if (!submitButton.disabled && !/processing/i.test(currentLabel)) return;
      if (!hasBlockingPaymentError()) return;
      submitButton.disabled = false;
      submitButton.removeAttribute("disabled");
      submitButton.removeAttribute("aria-busy");
      setSubmitButtonLabel(getStoredSubmitButtonLabel());
    };
    const scheduleSubmitButtonRecovery = () => {
      window.setTimeout(restoreSubmitButtonIfBlocked, 120);
      window.setTimeout(restoreSubmitButtonIfBlocked, 450);
      window.setTimeout(restoreSubmitButtonIfBlocked, 900);
    };

    rememberSubmitButtonLabel();
    if (submitButton && submitButton.dataset.djepRecoveryBound !== "1") {
      submitButton.dataset.djepRecoveryBound = "1";
      submitButton.addEventListener(
        "click",
        () => {
          rememberSubmitButtonLabel();
          scheduleSubmitButtonRecovery();
        },
        true
      );
    }
    if (form.dataset.djepSubmitRecoveryBound !== "1") {
      form.dataset.djepSubmitRecoveryBound = "1";
      form.addEventListener(
        "submit",
        () => {
          rememberSubmitButtonLabel();
          scheduleSubmitButtonRecovery();
        },
        true
      );
    }
    if (errorBox && errorBox.dataset.djepRecoveryObserved !== "1") {
      errorBox.dataset.djepRecoveryObserved = "1";
      const paymentErrorObserver = new MutationObserver(() => {
        restoreSubmitButtonIfBlocked();
      });
      paymentErrorObserver.observe(errorBox, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    mainCard?.querySelectorAll("input, select, textarea").forEach((field) => {
      if (!(field instanceof HTMLElement) || field.dataset.djepRecoveryBound === "1") return;
      field.dataset.djepRecoveryBound = "1";
      field.addEventListener("input", restoreSubmitButtonIfBlocked);
      field.addEventListener("change", restoreSubmitButtonIfBlocked);
    });
    cardholderName?.addEventListener("input", restoreSubmitButtonIfBlocked);
    restoreSubmitButtonIfBlocked();
  }

  function renderPaymentGatewayAltBox({ form, paymentBox, gatewayNotes, gatewayDetails }) {
    if (!(form instanceof HTMLElement) || !gatewayDetails) {
      return form?.querySelector(".djep-payment-altbox") || null;
    }

    let altBox = form.querySelector(".djep-payment-altbox");
    if (!altBox) {
      altBox = document.createElement("section");
      altBox.className = "djep-payment-altbox";
      form.insertBefore(altBox, paymentBox?.nextSibling || null);
    }

    altBox.innerHTML = "";

    const altTitle = document.createElement("p");
    altTitle.className = "djep-titlebarsmall";
    altTitle.textContent = "Other Ways to Pay";
    altBox.append(altTitle);

    const altContent = document.createElement("div");
    altContent.className = "djep-payment-altcontent";

    const linkGrid = document.createElement("div");
    linkGrid.className = "djep-payment-altlinks";

    gatewayDetails.links.forEach((item) => {
      const link = document.createElement("a");
      link.className = "djep-payment-altlink";
      link.href = normalizePaymentProviderHref(item.href || "");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const image = document.createElement("img");
      image.className = "djep-payment-altimage";
      image.alt = item.alt;
      image.src = item.src;
      link.append(image);
      linkGrid.append(link);
    });

    const checkCard = document.createElement("div");
    checkCard.className = "djep-payment-altlink djep-payment-altcard djep-payment-altcard--check";

    const checkLabel = document.createElement("span");
    checkLabel.className = "djep-payment-altlink-label";
    checkLabel.textContent = "Pay by Check";

    const checkAddress = document.createElement("span");
    checkAddress.className = "djep-payment-altcheck-address";
    checkAddress.textContent =
      cleanText(gatewayDetails.addressText || "") || readCompanyMailingAddressSync() || "Mailing address unavailable.";

    checkCard.append(checkLabel, checkAddress);
    linkGrid.append(checkCard);

    void getCompanyMailingAddress(gatewayDetails.addressText || "").then((addressText) => {
      const resolvedAddress = cleanText(addressText || "");
      if (!resolvedAddress || !checkAddress.isConnected) return;
      checkAddress.textContent = resolvedAddress;
    });

    altContent.append(linkGrid);
    altBox.append(altContent);
    retargetExistingPaymentAltLinks(form);
    gatewayNotes?.remove();

    return altBox;
  }

  function buildPaymentAltCopyHtml() {
    return (
      '<span class="djep-payment-alt-copy-line"><strong>Include event date and name on account when submitting.</strong></span>' +
      '<span class="djep-payment-alt-copy-line">Do NOT mark as a "Good or Service".</span>' +
      '<span class="djep-payment-alt-copy-line">Payments are manually processed and you will receive a confirmation email when applied.</span>'
    );
  }

  function buildStripeDetailsPaymentStep({ root, form, heading }) {
    root.classList.add("djep-payment-stripe-root");

    const requestButton = form.querySelector("#payment-request-button");
    const mainCard = form.querySelector("#maincarddiv");
    const legacyCardTitle =
      mainCard?.previousElementSibling && mainCard.previousElementSibling.classList.contains("djep-titlebar")
        ? mainCard.previousElementSibling
        : null;
    const billingBox = form.querySelector("#djep-billingcheckbox");
    const altAddress = form.querySelector("#alternative_card_address");
    const submitRow = form.querySelector("#card-submit");
    const errorBox = form.querySelector("#card-errors");
    const cardholderName = form.querySelector('input[name="cardholder_name"]');

    requestButton?.classList.add("djep-payment-wallet-box");
    mainCard?.classList.add("djep-payment-card-entry");
    billingBox?.classList.add("djep-payment-billing-box");
    submitRow?.classList.add("djep-payment-submit-row");
    errorBox?.classList.add("djep-payment-error-box");

    const { workspace, mainColumn, sideColumn } = ensurePaymentWorkspace(form);

    const paymentPanel =
      workspace.querySelector(".djep-payment-panel.djep-payment-details-panel") || document.createElement("section");
    if (!paymentPanel.classList.contains("djep-payment-panel")) {
      paymentPanel.className = "djep-payment-panel djep-payment-details-panel";
    }

    if (!paymentPanel.querySelector(":scope > .djep-titlebarsmall")) {
      const panelTitle = document.createElement("p");
      panelTitle.className = "djep-titlebarsmall";
      panelTitle.textContent = "Payment Details";
      paymentPanel.append(panelTitle);
    }

    if (billingBox && cardholderName && !paymentPanel.querySelector(".djep-payment-cardholder-block")) {
      const labelCell = cardholderName.closest(".col-xs-12.col-sm-9")?.previousElementSibling;
      const inputCell = cardholderName.closest(".col-xs-12.col-sm-9");
      const cardholderBlock = document.createElement("div");
      cardholderBlock.className = "djep-payment-cardholder-block";

      const cardholderLabel = document.createElement("label");
      cardholderLabel.className = "djep-payment-cardholder-label";
      cardholderLabel.setAttribute("for", "djep-cardholder-name");
      cardholderLabel.textContent = cleanText(labelCell?.textContent || "Card Holder Name");

      cardholderName.id = "djep-cardholder-name";
      cardholderName.classList.add("djep-payment-cardholder-input");

      cardholderBlock.append(cardholderLabel, cardholderName);
      paymentPanel.append(cardholderBlock);

      labelCell?.remove();
      inputCell?.remove();

      billingBox.querySelectorAll(":scope > .cf, :scope > div[style*='height:5px']").forEach((node) => {
        if (node.previousElementSibling == null) node.remove();
      });
    }

    legacyCardTitle?.remove();
    if (mainCard) paymentPanel.append(mainCard);
    if (errorBox) paymentPanel.append(errorBox);
    if (submitRow) paymentPanel.append(submitRow);
    if (requestButton) {
      requestButton.querySelectorAll(":scope > .djep-titlebar").forEach((node) => node.remove());
      paymentPanel.append(requestButton);
    }
    mainColumn?.append(paymentPanel);

    if (billingBox) {
      let billingPanel =
        workspace.querySelector(".djep-payment-panel.djep-payment-billing-panel") || document.createElement("section");
      if (!billingPanel.classList.contains("djep-payment-panel")) {
        billingPanel.className = "djep-payment-panel djep-payment-billing-panel";
      }
      if (!billingPanel.querySelector(":scope > .djep-titlebarsmall")) {
        const panelTitle = document.createElement("p");
        panelTitle.className = "djep-titlebarsmall";
        panelTitle.textContent = "Billing Details";
        billingPanel.append(panelTitle);
      }
      billingBox.querySelectorAll(":scope > .djep-titlebar").forEach((node) => node.remove());
      billingPanel.append(billingBox);
      sideColumn?.append(billingPanel);
    }

    if (billingBox) {
      const customerEmailInput = billingBox.querySelector('input[name="customer_email"], input#customer_email');
      const customerEmailBlock = customerEmailInput?.closest(".form-group, .col-xs-12, .row, .djep-payment-email-block, div");
      if (customerEmailInput) {
        customerEmailInput.required = false;
        customerEmailInput.removeAttribute("required");
      }
      if (customerEmailBlock instanceof HTMLElement) {
        customerEmailBlock.style.display = "none";
        customerEmailBlock.setAttribute("aria-hidden", "true");
      }
    }

    if (billingBox && altAddress) {
      initializePaymentBillingAddressSection({ form, billingBox, altAddress });
    }

    const pruneWalletBox = () => {
      if (!requestButton) return;
      if (isLocalPreviewEnvironment()) {
        requestButton.style.display = "none";
        return;
      }
      const innerWallet = requestButton.querySelector("#inner-payment-request-button") || requestButton;
      const hasVisibleControl =
        !!innerWallet.querySelector("button, iframe, .payment-request-button, [role='button']") ||
        cleanText(innerWallet.textContent).length > 0;
      requestButton.style.display = hasVisibleControl ? "" : "none";
    };

    pruneWalletBox();
    window.setTimeout(pruneWalletBox, 450);
    window.setTimeout(pruneWalletBox, 1200);

    mountPaymentWorkspace(form, heading, workspace);

    if (cardholderName && !cardholderName.getAttribute("placeholder")) {
      cardholderName.setAttribute("placeholder", "Name on card");
    }

    bindPaymentSubmitRecovery({ form, submitRow, errorBox, mainCard, cardholderName });

    const duplicateWalletTitles = requestButton?.querySelectorAll(":scope > .djep-titlebar");
    if (duplicateWalletTitles && duplicateWalletTitles.length > 1) {
      duplicateWalletTitles.forEach((title, index) => {
        if (index > 0) title.remove();
      });
    }
  }

  function buildAmountEntryPaymentStep({ form, heading, paymentBox, inner }) {
    const { workspace, mainColumn, sideColumn } = ensurePaymentWorkspace(form);

    paymentBox.classList.add("djep-payment-panel", "djep-payment-entry-panel");
    paymentBox
      .querySelectorAll(":scope > .djep-payment-titlebar, :scope > .djep-titlebar")
      .forEach((node) => node.remove());

    let mainTitle = paymentBox.querySelector(":scope > .djep-titlebarsmall");
    if (!mainTitle) {
      mainTitle = document.createElement("p");
      mainTitle.className = "djep-titlebarsmall";
      mainTitle.textContent = "Pay by Credit Card or Debit Card";
      paymentBox.prepend(mainTitle);
    } else {
      mainTitle.textContent = "Pay by Credit Card or Debit Card";
    }

    let panelCopy = paymentBox.querySelector(":scope > .djep-payment-panel-copy");
    if (!panelCopy) {
      panelCopy = document.createElement("p");
      panelCopy.className = "djep-payment-panel-copy";
      mainTitle.insertAdjacentElement("afterend", panelCopy);
    }
    panelCopy.textContent = "";

    const summaryCard = inner.querySelector(".djep-payment-summary-card");
    const amountCard = inner.querySelector(".djep-payment-amount-card");
    const submitCard = inner.querySelector(".djep-payment-submit-card");
    const warning = form.querySelector(".djep-payment-warning-inline");

    let contentGrid = paymentBox.querySelector(".djep-payment-entry-grid");
    if (!contentGrid) {
      contentGrid = document.createElement("div");
      contentGrid.className = "djep-payment-entry-grid";
      if (warning) {
        paymentBox.insertBefore(contentGrid, warning.nextSibling);
      } else if (mainTitle.nextSibling) {
        paymentBox.insertBefore(contentGrid, mainTitle.nextSibling);
      } else {
        paymentBox.append(contentGrid);
      }
    }
    if (warning) paymentBox.append(warning);
    if (amountCard) {
      amountCard.classList.add("djep-payment-entry-maincard");
      contentGrid.append(amountCard);
    }
    if (submitCard) {
      submitCard.classList.add("djep-payment-entry-sidecard");
      contentGrid.append(submitCard);
    }
    if (summaryCard) {
      let summaryPanel =
        workspace.querySelector(".djep-payment-panel.djep-payment-summary-panel") || document.createElement("section");
      if (!summaryPanel.classList.contains("djep-payment-panel")) {
        summaryPanel.className = "djep-payment-panel djep-payment-summary-panel";
      }
      if (!summaryPanel.querySelector(":scope > .djep-titlebarsmall")) {
        const panelTitle = document.createElement("p");
        panelTitle.className = "djep-titlebarsmall";
        panelTitle.textContent = "Current Balance Due";
        summaryPanel.append(panelTitle);
      }
      summaryPanel.append(summaryCard);
      sideColumn?.append(summaryPanel);
    }

    mainColumn?.append(paymentBox);
    const altBox = form.querySelector(".djep-payment-altbox");
    if (altBox) {
      altBox.classList.add("djep-payment-panel", "djep-payment-alt-panel");
      let altCopy = altBox.querySelector(":scope > .djep-payment-panel-copy");
      if (!altCopy) {
        altCopy = document.createElement("p");
        altCopy.className = "djep-payment-panel-copy djep-payment-alt-copy";
        const altTitle = altBox.querySelector(":scope > .djep-titlebarsmall");
        if (altTitle) {
          altTitle.insertAdjacentElement("afterend", altCopy);
        } else {
          altBox.prepend(altCopy);
        }
      }
      altCopy.classList.add("djep-payment-alt-copy");
      altCopy.innerHTML = buildPaymentAltCopyHtml();
      sideColumn?.append(altBox);
    }

    mountPaymentWorkspace(form, heading, workspace);
  }

  function normalizeRequestChangesHeading(heading) {
    if (!(heading instanceof HTMLElement) || heading.querySelector(".djep-requestchanges-subtitle")) return;

    const textNodes = Array.from(heading.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    if (textNodes.length) {
      textNodes[0].textContent = "Request Changes";
    } else {
      heading.insertBefore(document.createTextNode("Request Changes"), heading.firstChild);
    }

    const subtitle = document.createElement("span");
    subtitle.className = "djep-requestchanges-subtitle";
    subtitle.textContent =
      "Submit date, time, venue, or other event updates so our team can review your requested change.";
    heading.append(subtitle);
  }

  function enhanceRequestChangesSelector(changeTypeBox) {
    if (!(changeTypeBox instanceof HTMLElement)) return;

    const optionColumns = Array.from(changeTypeBox.querySelectorAll(".col-xs-12"));
    const optionsColumn = optionColumns.length ? optionColumns[optionColumns.length - 1] : null;
    if (!optionsColumn) return;

    changeTypeBox.classList.add("djep-requestchanges-selector");
    optionsColumn.classList.add("djep-requestchanges-options");

    const descriptions = new Map([
      ["date", "Move the celebration to a different calendar date."],
      ["time", "Adjust the planned start time, end time, or both."],
      ["venue", "Switch the event location to a different venue."],
      ["other", "Request another type of event update for our team to review."]
    ]);

    const radioRows = Array.from(optionsColumn.querySelectorAll(":scope > .radio"));
    const syncActiveOption = () => {
      radioRows.forEach((row) => {
        const input = row.querySelector('input[type="radio"]');
        row.classList.toggle("is-active", Boolean(input?.checked));
      });
    };

    radioRows.forEach((row) => {
      row.classList.add("djep-requestchanges-option");

      const label = row.querySelector("label");
      const input = row.querySelector('input[type="radio"]');
      if (!label || !input) return;

      label.classList.add("djep-requestchanges-option-label");

      if (!label.querySelector(".djep-requestchanges-option-title")) {
        const optionText = Array.from(label.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        Array.from(label.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .forEach((node) => node.remove());

        const title = document.createElement("span");
        title.className = "djep-requestchanges-option-title";
        title.textContent = optionText;
        label.append(title);

        const detail = document.createElement("span");
        detail.className = "djep-requestchanges-option-detail";
        detail.textContent = descriptions.get(input.value) || "Select this option to continue.";
        label.append(detail);
      }

      input.addEventListener("change", syncActiveOption);
      row.addEventListener("click", () => {
        window.setTimeout(syncActiveOption, 0);
      });
    });

    syncActiveOption();
  }

  function styleRequestChangesSelects(requestBox) {
    if (!(requestBox instanceof HTMLElement)) return;

    requestBox.querySelectorAll('[id^="change_of_"] select').forEach((select) => {
      select.style.setProperty("display", "block", "important");
      select.style.setProperty("width", "100%", "important");
      select.style.setProperty("min-width", "0", "important");
      select.style.setProperty("height", "46px", "important");
      select.style.setProperty("min-height", "46px", "important");
      select.style.setProperty("padding", "11px 42px 11px 14px", "important");
      select.style.setProperty("border", "1px solid #ccd7e7", "important");
      select.style.setProperty("border-radius", "14px", "important");
      select.style.setProperty("background-color", "#ffffff", "important");
      select.style.setProperty(
        "background-image",
        "linear-gradient(180deg,#ffffff,#f8fbff),linear-gradient(45deg, transparent 50%, #667085 50%),linear-gradient(135deg, #667085 50%, transparent 50%)",
        "important"
      );
      select.style.setProperty("background-repeat", "no-repeat, no-repeat, no-repeat", "important");
      select.style.setProperty(
        "background-position",
        "0 0, calc(100% - 18px) calc(50% - 3px), calc(100% - 12px) calc(50% - 3px)",
        "important"
      );
      select.style.setProperty("background-size", "100% 100%, 6px 6px, 6px 6px", "important");
      select.style.setProperty("-webkit-appearance", "none", "important");
      select.style.setProperty("-moz-appearance", "none", "important");
      select.style.setProperty("appearance", "none", "important");
      select.style.setProperty("box-sizing", "border-box", "important");
      select.style.setProperty("line-height", "1.2", "important");
      select.style.setProperty("margin", "0 0 2px 0", "important");
    });
  }

  function mountPaymentSuccessShell(content, heading, subtitleSource) {
    let shell = content.querySelector(":scope > .djep-payment-success-shell");
    let card = shell?.querySelector(".djep-payment-success-card");

    if (!shell) {
      shell = document.createElement("section");
      shell.className = "djep-payment-success-shell";
      card = document.createElement("div");
      card.className = "djep-payment-success-card";
      shell.append(card);

      const footer = content.querySelector(":scope > #footer");
      const clear = content.querySelector(":scope > .djep-cleared");
      const movable = Array.from(content.children).filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        return node !== shell && node !== footer && node !== clear && node !== heading && node !== subtitleSource;
      });

      content.insertBefore(shell, subtitleSource?.nextSibling || footer || clear || null);
      movable.forEach((node) => card.append(node));
    }

    return { shell, card };
  }

  function applyPaymentSuccessHeading(content, shell, heading, subtitleSource, card) {
    let resolvedHeading = heading;

    if (!(resolvedHeading instanceof HTMLElement)) {
      resolvedHeading =
        content.querySelector(':scope > h1, :scope > h2.djep-h2, :scope > h2, :scope > h3') ||
        card.querySelector("h1, h2.djep-h2, h2, h3") ||
        Array.from(content.querySelectorAll("p, div, span, strong, h1, h2, h3")).find((node) => {
          const text = cleanText(node.textContent || "");
          return /payment|thank you|success|received/i.test(text) && text.length <= 120;
        });
    }

    if (resolvedHeading instanceof HTMLElement && shell.previousElementSibling !== resolvedHeading) {
      content.insertBefore(resolvedHeading, shell);
    }

    if (resolvedHeading instanceof HTMLElement) {
      resolvedHeading.classList.add("djep-payment-success-title");
    }

    const textBlocks = Array.from(card.querySelectorAll("p, li, td, th, div")).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.closest(".djep-payment-success-actions")) return false;
      if (node === resolvedHeading) return false;
      return cleanText(node.textContent || "").length > 0 && !node.children.length;
    });

    const subtitle = textBlocks.find((node) => {
      const text = cleanText(node.textContent || "");
      return text.length > 30 && text.length < 240;
    });

    if (resolvedHeading instanceof HTMLElement) {
      const subtitleNode = subtitleSource || subtitle;
      const subtitleText = cleanText(subtitleNode?.textContent || "");
      if (subtitleNode && subtitleNode !== resolvedHeading) subtitleNode.remove();

      if (subtitleText && !resolvedHeading.querySelector(".djep-payment-success-subtitle")) {
        const subtitleElement = document.createElement("span");
        subtitleElement.className = "djep-payment-success-subtitle";
        subtitleElement.textContent = subtitleText;
        resolvedHeading.append(subtitleElement);
      }
    }

    return resolvedHeading;
  }

  function mountPaymentSuccessActions(content, shell, card) {
    const actionCandidates = Array.from(
      card.querySelectorAll('a[href], button, input[type="submit"], input[type="button"]')
    ).filter((node) => node instanceof HTMLElement);

    if (!actionCandidates.length) return;

    let actions = content.querySelector(":scope > .djep-payment-success-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "djep-payment-success-actions";
      content.insertBefore(actions, shell.nextSibling);
    }

    actionCandidates.forEach((node) => {
      if (actions.contains(node)) return;
      node.classList.add("djep-payment-success-action");
      node.classList.add("djep-actionbutton");
      actions.append(node);
    });
  }

  function buildPlanAccessNotice(lockMessage) {
    const note = document.createElement("div");
    note.className = "djep-plan-access-note";

    const icon = document.createElement("span");
    icon.className = "djep-plan-access-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "!";

    const copy = document.createElement("div");
    copy.className = "djep-plan-access-copy";

    const label = document.createElement("div");
    label.className = "djep-plan-access-label";
    label.textContent = "Planning Window Notice";

    const firstSentence = document.createElement("p");
    firstSentence.className = "djep-plan-access-message";

    const lockMatch = cleanText(lockMessage || "").match(/Your planning forms will be locked at\s+(.+?)\.\s*/i);
    if (lockMatch) {
      firstSentence.textContent = `Your planning forms will be locked at ${lockMatch[1]}.`;
    } else {
      firstSentence.textContent = cleanText(lockMessage || "");
    }

    copy.append(label, firstSentence);
    note.append(icon, copy);
    return note;
  }

  function buildPlanMusicToolsGrid(musicBox) {
    if (!(musicBox instanceof HTMLElement) || musicBox.querySelector(".djep-plan-tools-grid")) return null;

    const toolsGrid = document.createElement("div");
    toolsGrid.className = "djep-plan-tools-grid";

    const toolMap = [
      ["#djep-addsongimage a", "Browse Music", "Build and refine your playlist."],
      ["#djep-musicrequestsimage a", "Song Requests", "Review music requests tied to this event."],
      ["#djep-guestrequestsimage a", "Guest Requests", "Track guest-submitted song requests."]
    ];

    toolMap.forEach(([selector, label, note]) => {
      const link = musicBox.querySelector(selector);
      if (!link) return;

      link.classList.add("djep-plan-tool");
      link.textContent = "";

      const dot = document.createElement("span");
      dot.className = "djep-plan-tool-dot";
      dot.textContent = "+";

      const copy = document.createElement("span");
      copy.className = "djep-plan-tool-copy";

      const title = document.createElement("span");
      title.className = "djep-plan-tool-title";
      title.textContent = label;

      const noteText = document.createElement("span");
      noteText.className = "djep-plan-tool-note";
      noteText.textContent = note;

      copy.append(title, noteText);
      link.append(dot, copy);
      toolsGrid.append(link);
    });

    Array.from(musicBox.children).forEach((child) => {
      if (!child.classList?.contains("djep-titlebar")) {
        child.remove();
      }
    });

    musicBox.append(toolsGrid);
    return toolsGrid;
  }

  function cleanupPlanningContentRoot(contentRoot, preservedNodes) {
    if (!(contentRoot instanceof HTMLElement)) return;
    const keep = new Set((preservedNodes || []).filter(Boolean));

    Array.from(contentRoot.children).forEach((child) => {
      if (keep.has(child)) return;
      if (child.tagName === "SCRIPT") return;
      if (child.classList.contains("cf") || child.tagName === "BR") {
        child.remove();
        return;
      }
      if (child.tagName === "DIV" && !child.className && !cleanText(child.textContent || "") && child.children.length === 0) {
        child.remove();
      }
    });
  }

  function mountPlanningFormsToolbar({
    form,
    formTitle,
    topSaveButton,
    timerNode,
    disableLabel,
    disableToggle,
  }) {
    if (!(form instanceof HTMLElement) || form.querySelector(".djep-planningform-toolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.className = "djep-planningform-toolbar";

    const intro = document.createElement("div");
    intro.className = "djep-planningform-toolbar-intro";

    const introLabel = document.createElement("div");
    introLabel.className = "djep-planningform-toolbar-label";
    introLabel.textContent = "Form Overview";

    const introTitle = document.createElement("div");
    introTitle.className = "djep-planningform-toolbar-title";
    introTitle.textContent = formTitle;

    const introNote = document.createElement("p");
    introNote.className = "djep-planningform-toolbar-note";
    introNote.textContent =
      "Changes save automatically while you work. Use Save Changes any time you want to commit the latest version immediately.";

    const suggestionsLink = Array.from(form.querySelectorAll("a")).find((link) => {
      const text = cleanText(link.textContent || "");
      return text.indexOf("Song Suggestions") > -1;
    });

    if (suggestionsLink) {
      const tip = document.createElement("p");
      tip.className = "djep-planningform-toolbar-tip";

      const tipLabel = document.createElement("span");
      tipLabel.className = "djep-planningform-toolbar-tip-label";
      tipLabel.textContent = "Tip";

      const tipLink = suggestionsLink.cloneNode(true);
      tipLink.classList.add("djep-planningform-toolbar-tip-link");
      tipLink.textContent = "View song suggestions";

      tip.append(tipLabel, tipLink);
      intro.append(introLabel, introTitle, introNote, tip);
    } else {
      intro.append(introLabel, introTitle, introNote);
    }

    const meta = document.createElement("div");
    meta.className = "djep-planningform-toolbar-meta";

    if (topSaveButton) {
      topSaveButton.value = "Save Changes";
      topSaveButton.textContent = "Save Changes";
      topSaveButton.classList.add("djep-planningform-save-top");
      meta.append(topSaveButton);
    }

    if (timerNode) {
      const autosaveCard = document.createElement("div");
      autosaveCard.className = "djep-planningform-meta-card";

      const autosaveLabel = document.createElement("div");
      autosaveLabel.className = "djep-planningform-meta-label";
      autosaveLabel.textContent = "Auto Save";

      timerNode.classList.add("djep-planningform-timer");
      autosaveCard.append(autosaveLabel, timerNode);

      if (disableToggle && disableLabel) {
        const toggleCard = document.createElement("label");
        toggleCard.className = "djep-planningform-toggle";
        toggleCard.setAttribute("for", "toggleautosave");

        const toggleText = document.createElement("span");
        toggleText.className = "djep-planningform-toggle-text";
        toggleText.textContent = cleanText(disableLabel.textContent || "Disable Auto Save");

        toggleCard.append(disableToggle, toggleText);
        autosaveCard.append(toggleCard);
      }

      meta.append(autosaveCard);
    }

    toolbar.append(intro, meta);
    form.insertBefore(toolbar, form.firstChild);
  }

  function classifyPlanningFormsTable(table) {
    if (!(table instanceof HTMLElement)) return;

    table.classList.add("djep-planningform-section-card");

    const rows = Array.from(table.querySelectorAll("tr"));
    rows.forEach((row, index) => {
      if (index === 0) {
        row.classList.add("djep-planningform-section-row");
        return;
      }

      const cells = Array.from(row.cells || []);
      const hasControls = !!row.querySelector("input, select, textarea");
      const hasTextarea = !!row.querySelector("textarea");
      const hasImagePicker = !!row.querySelector("img.djepform_image");
      const isSingleCell = cells.length === 1 || cells[0]?.colSpan === 2;

      if (hasImagePicker) {
        row.classList.add("djep-planningform-image-row");
      } else if (isSingleCell && hasTextarea) {
        row.classList.add("djep-planningform-fullcontrol-row");
      } else if (isSingleCell && !hasControls) {
        row.classList.add("djep-planningform-note-row");
      } else {
        row.classList.add("djep-planningform-field-row");
      }

      const firstCell = cells[0];
      if (firstCell) {
        const labelText = cleanText(firstCell.textContent || "");
        if (labelText.startsWith("---")) {
          row.classList.add("djep-planningform-subfield-row");
        }
        if (labelText.startsWith("***")) {
          row.classList.add("djep-planningform-note-row");
        }
      }
    });
  }

  function removePlanningSongSuggestionLinks(form) {
    if (!(form instanceof HTMLElement)) return;
    form.querySelectorAll("td.ed a").forEach((link) => {
      const text = cleanText(link.textContent || "");
      if (text.indexOf("Song Suggestions") > -1) {
        link.remove();
      }
    });
  }

  function normalizePlanningCheckboxCells(form) {
    if (!(form instanceof HTMLElement)) return;

    form.querySelectorAll("tr td:last-child").forEach((cell) => {
      const checkboxes = Array.from(cell.querySelectorAll('input[type="checkbox"]'));
      if (checkboxes.length < 2 || cell.querySelector(".djep-planningform-checkbox-grid")) return;

      const optionNodes = [];
      let current = null;

      Array.from(cell.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches('input[type="checkbox"]')) {
          current = { input: node, text: "" };
          optionNodes.push(current);
          return;
        }

        if (!current) return;

        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
          current = null;
          node.remove();
          return;
        }

        current.text += node.textContent || "";
      });

      const grid = document.createElement("div");
      grid.className = "djep-planningform-checkbox-grid";

      optionNodes.forEach((option) => {
        const label = document.createElement("label");
        label.className = "djep-planningform-checkbox-option";
        label.append(option.input);

        const text = document.createElement("span");
        text.textContent = cleanText(option.text);
        label.append(text);
        grid.append(label);
      });

      cell.innerHTML = "";
      cell.append(grid);
    });
  }

  function createPlanningFormsLandingShell(content) {
    if (!(content instanceof HTMLElement)) return null;

    let shell = content.querySelector(":scope > .djep-planningformslanding-shell");
    if (shell instanceof HTMLElement) return shell;

    shell = document.createElement("section");
    shell.className = "djep-planningformslanding-shell";
    shell.innerHTML = `
      <section class="djep-planningformslanding-hero">
        <div class="djep-planningformslanding-eyebrow">Form Picker</div>
        <div class="djep-planningformslanding-herotitle">Open the planning worksheet you need.</div>
        <div class="djep-planningformslanding-copy">Edit is best when you need to make changes. View is useful when you only need to review answers quickly on your phone.</div>
        <div class="djep-planningformslanding-count">Loading Forms</div>
      </section>
      <section class="djep-planningformslanding-listwrap">
        <div class="djep-planningformslanding-listlabel">Available Forms</div>
        <div class="djep-planningformslanding-list"></div>
      </section>
    `.trim();
    content.append(shell);
    return shell;
  }

  function renderPlanningFormsLandingEmptyState(list, countNode, planHref, message) {
    if (!(list instanceof HTMLElement)) return;
    list.innerHTML = "";
    const empty = document.createElement("section");
    empty.className = "djep-planningformslanding-empty";
    empty.innerHTML = `
      <div class="djep-planningformslanding-eyebrow">No Forms Loaded</div>
      <div class="djep-planningformslanding-emptycopy">${message}</div>
      <div class="djep-planningformslanding-actions">
        <a class="djep-actionbutton djep-planningformslanding-action" href="${planHref}">Back to Planning</a>
      </div>
    `.trim();
    list.append(empty);
    if (countNode) countNode.textContent = "No Forms";
  }

  function renderPlanningFormsLandingEntries(list, countNode, planHref, entries) {
    if (!(list instanceof HTMLElement)) return;
    list.innerHTML = "";

    if (!entries.length) {
      renderPlanningFormsLandingEmptyState(
        list,
        countNode,
        planHref,
        "We could not find any planning forms for this event from the portal."
      );
      return;
    }

    entries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "djep-planningformslanding-card";

      const title = document.createElement("div");
      title.className = "djep-planningformslanding-cardtitle";
      title.textContent = entry.title;

      const note = document.createElement("div");
      note.className = "djep-planningformslanding-cardnote";
      note.textContent = entry.note || "Open this planning form to review or update its answers.";

      const actions = document.createElement("div");
      actions.className = "djep-planningformslanding-actions";

      if (entry.editHref) {
        const editLink = document.createElement("a");
        editLink.className = "djep-actionbutton djep-planningformslanding-action";
        editLink.href = entry.editHref;
        editLink.textContent = "Edit";
        actions.append(editLink);
      }

      if (entry.viewHref) {
        const viewLink = document.createElement("a");
        viewLink.className = "djep-planningformslanding-action djep-planningformslanding-action--secondary";
        viewLink.href = entry.viewHref;
        viewLink.textContent = "View";
        actions.append(viewLink);
      }

      card.append(title, note, actions);
      list.append(card);
    });

    if (countNode) {
      countNode.textContent = `${entries.length} ${entries.length === 1 ? "Form" : "Forms"} Available`;
    }
  }

  function parsePlanningFormsEntriesFromMarkup(markup) {
    const doc = new DOMParser().parseFromString(markup, "text/html");
    return Array.from(doc.querySelectorAll("#page_planmyevent .djep-planningformsbox tr"))
      .map((row) => {
        const title = cleanText(row.querySelector(".djep-plan-entry-title")?.textContent || row.cells?.[1]?.textContent || "");
        const note = cleanText(row.querySelector(".djep-plan-entry-note")?.textContent || "");
        const editHref = normalizeShellHref(row.querySelector('a[href*="action=edit"]')?.getAttribute("href") || "");
        const viewHref = normalizeShellHref(row.querySelector('a[href*="action=view"]')?.getAttribute("href") || "");
        if (!title || (!editHref && !viewHref)) return null;
        return { title, note, editHref, viewHref };
      })
      .filter(Boolean);
  }

  function buildPlanningFormsFallbackEntries(eventId) {
    return [
      {
        title: "Primary Planning Form",
        note: "Open the main planning worksheet for this event.",
        editHref: normalizeShellHref(`/clients/planningforms.asp?action=edit_primary_planning_form&eventid=${encodeURIComponent(eventId)}`),
        viewHref: normalizeShellHref(`/clients/planningforms.asp?action=view_primary_planning_form&eventid=${encodeURIComponent(eventId)}`)
      }
    ].filter((entry) => entry.editHref || entry.viewHref);
  }

  function createQueuedMusicRequestMetaSync(musicBox, syncFn) {
    return function queueMusicRequestMetaSync() {
      if (!(musicBox instanceof HTMLElement) || typeof syncFn !== "function") return;
      if (musicBox.dataset.djepMusicRequestMetaSyncQueued === "1") return;
      musicBox.dataset.djepMusicRequestMetaSyncQueued = "1";
      window.requestAnimationFrame(() => {
        delete musicBox.dataset.djepMusicRequestMetaSyncQueued;
        syncFn();
      });
    };
  }

  function createMusicRequestViewsRefresher({
    requestsContent,
    requestsAccordion,
    requestsCell,
    setMusicRequestView,
    queueMusicRequestMetaSync,
    refreshMusicRequestMobilePresentation,
    refreshMusicEmptyStates,
    normalizeMusicAccordionWidths,
  }) {
    return function refreshMusicRequestViews() {
      if (!(requestsContent instanceof HTMLElement) || !(requestsAccordion instanceof HTMLElement)) return;
      removeMusicNativeSelectionNav(requestsContent);
      const protectedNodes = collectMusicRequestProtectedNodes(requestsContent);
      cleanupLegacyMusicRequestControls(requestsContent, protectedNodes);

      ensureMusicRequestSwitcher(requestsContent, setMusicRequestView);
      attachMusicRequestsPane({
        requestsContent,
        requestsAccordion,
        refreshMusicEmptyStates,
        refreshMusicRequestMobilePresentation,
        normalizeAccordionWidths: normalizeMusicAccordionWidths,
      });
      attachMusicPlaylistsPane({
        requestsContent,
        requestsCell,
        normalizeAccordionWidths: normalizeMusicAccordionWidths,
      });

      setMusicRequestView(requestsContent.dataset.djepMusicRequestView || "requests");
      queueMusicRequestMetaSync();
      refreshMusicRequestMobilePresentation();
    };
  }

  function installSpotifyBehaviorPatch({ spotifyPanel, spotifyTracksPanel }) {
    if (!(spotifyPanel instanceof HTMLElement) || spotifyPanel.dataset.djepSpotifyBehaviorPatch === "1") return;
    spotifyPanel.dataset.djepSpotifyBehaviorPatch = "1";

    const spotifyPlaylistsPanel = spotifyPanel.querySelector("#spotify-playlists");
    const spotifyMusicState = getSpotifyMusicState(spotifyPanel);

    const originalBackToPlaylists = typeof window.backToPlaylists === "function" ? window.backToPlaylists : null;
    const originalLoadSpotifyInterface =
      typeof window.loadSpotifyInterface === "function" ? window.loadSpotifyInterface : null;
    const originalAddWholePlaylistOrAlbum =
      typeof window.addWholePlaylistOrAlbum === "function" ? window.addWholePlaylistOrAlbum : null;

    window.backToPlaylists = function backToPlaylistsPatched() {
      resetSpotifyAddPlaylistButtons(spotifyTracksPanel);
      spotifyMusicState.trackToken += 1;
      if (originalBackToPlaylists) {
        return originalBackToPlaylists.apply(this, arguments);
      }
      resetSpotifyTracksPanel(spotifyTracksPanel);
      if (spotifyPlaylistsPanel) {
        spotifyPlaylistsPanel.style.display = "";
      }
    };

    window.loadSpotifyInterface = function loadSpotifyInterfacePatched() {
      if (!(spotifyPlaylistsPanel instanceof HTMLElement)) {
        return originalLoadSpotifyInterface?.apply(this, arguments);
      }
      const loaded = loadSpotifyPlaylistsIntoPanel({
        spotifyPanel,
        spotifyPlaylistsPanel,
        spotifyTracksPanel,
        emptyMessage: "Spotify playlists are temporarily unavailable. Try reconnecting.",
      });
      if (!loaded) {
        return originalLoadSpotifyInterface?.apply(this, arguments);
      }
    };

    if (typeof window.buildPlaylistTable === "function") {
      window.loadPlaylistTracks = function loadPlaylistTracksPatched(playlistid, playlistName) {
        const eventId = getSpotifyEventId();
        if (!playlistid || !window.jQuery || !spotifyTracksPanel || !spotifyPlaylistsPanel || !eventId) {
          return;
        }

        const requestToken = ++spotifyMusicState.trackToken;
        window.jQuery("#load_spotify_image").hide();
        spotifyPlaylistsPanel.style.display = "none";
        resetSpotifyTracksPanel(spotifyTracksPanel);

        window.jQuery
          .ajax({
            url: "spotify.php?action=load_playlist_tracks",
            type: "GET",
            data: { playlistid, playlist_name: playlistName },
          })
          .done((result) => {
            if (requestToken !== spotifyMusicState.trackToken) return;

            const dataTableHelper = String(window.buildPlaylistTable(result, "spotify") || "").split("<*****>");
            const numberOfTracks = Number(dataTableHelper[0]) || 0;
            const dataHTML = dataTableHelper[1] || "";

            spotifyTracksPanel.innerHTML = buildSpotifyTracksPanelMarkup({
              numberOfTracks,
              playlistName,
              playlistId: playlistid,
              eventId,
              dataHTML,
            });
            spotifyTracksPanel.style.display = "";
            applySpotifyScrollablePanelStyles(spotifyTracksPanel);
            bindSpotifyTrackDraggables(numberOfTracks);
          })
          .fail(() => {
            if (requestToken !== spotifyMusicState.trackToken) return;
            window.backToPlaylists();
          });
      };
    }

    window.addWholePlaylistOrAlbum = function addWholePlaylistOrAlbumPatched(itemId, itemType, itemEventId, playlistName) {
      if (!window.jQuery || !spotifyTracksPanel) {
        return originalAddWholePlaylistOrAlbum?.apply(this, arguments);
      }

      resetSpotifyAddPlaylistButtons(spotifyTracksPanel);
      window.jQuery(spotifyTracksPanel).find(".djep-addplaylistbutton").hide().attr("aria-busy", "true");
      window.jQuery(spotifyTracksPanel).find(".djep-addingplaylistbutton").show();

      window.jQuery
        .ajax({
          url: "spotify.php?action=import_album_or_playlist",
          type: "POST",
          data: {
            item_id: itemId,
            item_type: itemType,
            item_eventid: itemEventId,
            playlist_name: playlistName,
          },
        })
        .done((result) => {
          const normalizedResult = String(result || "").trim().toLowerCase();
          const alreadyImported =
            normalizedResult.includes("already been imported") || normalizedResult.includes("already imported");
          const explicitError =
            normalizedResult.includes("error") ||
            normalizedResult.includes("unable") ||
            normalizedResult.includes("failed") ||
            normalizedResult.includes("invalid");
          if (
            normalizedResult === "complete" ||
            normalizedResult.startsWith("complete") ||
            normalizedResult.includes("success") ||
            alreadyImported ||
            (!explicitError && normalizedResult.indexOf("<**>") === -1)
          ) {
            window.location.reload();
            return;
          }

          resetSpotifyAddPlaylistButtons(spotifyTracksPanel);
          const errorMessage = String(result || "").split("<**>");
          window.alert(
            `ERROR: Something went wrong when adding your ${itemType}. Please try again. \n\n Error Message: ${errorMessage[1] || "Unknown error"}`
          );
        })
        .fail(() => {
          resetSpotifyAddPlaylistButtons(spotifyTracksPanel);
          window.alert(`ERROR: Something went wrong when adding your ${itemType}. Please try again.`);
        });
    };
  }

  function bindSpotifyPlaylistResetWatcher(spotifyTracksPanel, requestsContent) {
    if (!(spotifyTracksPanel instanceof HTMLElement) || spotifyTracksPanel.dataset.djepSpotifyPlaylistResetBound === "1") return;
    spotifyTracksPanel.dataset.djepSpotifyPlaylistResetBound = "1";
    let resetTimer = null;
    let reloadTimer = null;

    spotifyTracksPanel.addEventListener("click", (event) => {
      const addButton = event.target.closest(".djep-addplaylistbutton");
      if (!(addButton instanceof HTMLElement)) return;

      addButton.setAttribute("aria-busy", "true");
      window.clearTimeout(resetTimer);
      window.clearTimeout(reloadTimer);
      resetTimer = window.setTimeout(() => {
        resetSpotifyAddPlaylistButtons(spotifyTracksPanel);
      }, 8000);
      reloadTimer = window.setTimeout(() => {
        const hasBusyButton = hasVisibleSpotifyBusyButton(spotifyTracksPanel);
        if (hasBusyButton) {
          window.location.reload();
        }
      }, 2500);
    });

    if (requestsContent && typeof MutationObserver === "function") {
      const observer = new MutationObserver(() => {
        const hasBusyButton = hasVisibleSpotifyBusyButton(spotifyTracksPanel);
        if (!hasBusyButton) return;

        window.clearTimeout(resetTimer);
        window.clearTimeout(reloadTimer);
        window.setTimeout(() => {
          resetSpotifyAddPlaylistButtons(spotifyTracksPanel);
        }, 600);
      });

      observer.observe(requestsContent, { childList: true, subtree: true });
    }
  }

  function refreshExistingMusicShell({
    musicBox,
    requestLimitBox,
    normalizeMusicRequestHeaders,
    normalizeMusicPlaylistRows,
    requestsCell,
    refreshMusicEmptyStates,
    refreshMusicRequestViews,
    queueMusicRequestMetaSync,
    normalizeMusicMobileLayout,
    refreshMusicRequestMobilePresentation,
    enhanceMusicDropTargets,
    form,
    tabs,
    requestsContent,
  }) {
    const staleInstructionBlocks = Array.from(
      musicBox.querySelectorAll("#tabs .djep-tabs-all > div, .djep-music-browser-tip, .djep-music-instructions")
    ).filter((node) => {
      const text = cleanText(node.textContent || "");
      return text.includes("How it works") || text.startsWith("Instructions:");
    });

    staleInstructionBlocks.forEach((node) => node.remove());

    const browserHeadCopy = musicBox.querySelector(".djep-music-browser-head .djep-music-shell-head-copy");
    if (browserHeadCopy) {
      browserHeadCopy.textContent = "Search by artist, song title, charts, or genres.";
    }

    const requestsHeadCopy = musicBox.querySelector(".djep-music-requests-head .djep-music-shell-head-copy");
    if (requestsHeadCopy) {
      requestsHeadCopy.textContent = "Drag tracks into a list or click a saved song to edit it.";
    }

    normalizeMusicRequestHeaders();
    normalizeMusicPlaylistRows(requestsCell);
    refreshMusicEmptyStates();
    refreshMusicRequestViews();
    if (requestLimitBox) {
      requestLimitBox.remove();
    }
    queueMusicRequestMetaSync();
    runAfterDelays(queueMusicRequestMetaSync, [120, 500]);
    normalizeMusicMobileLayout();
    refreshMusicRequestMobilePresentation();
    enhanceMusicDropTargets();
    installOfflineMusicMutationShim({
      requestsCell,
      normalizeMusicRequestHeaders,
      refreshMusicEmptyStates,
      enhanceMusicDropTargets,
    });
    patchTopHitsOptionFunctions(form);
    observeTopHitsHeader();
    keepTopHitsDropdownSynced(form, tabs);
    bindTopHitsTabDropdownRefresh(tabs);
    convertTopHitsOptionsToDropdown();
    syncTopHitsPrimaryButtons();
  }

  function refreshMusicEmptyStates(requestsAccordion) {
    requestsAccordion?.querySelectorAll(".ui-accordion-content").forEach((panel) => {
      const requestTable = panel.querySelector(".djep-playlist-listing");
      const rowCount = requestTable ? requestTable.querySelectorAll("tr").length : 0;
      const requestFrame = panel.querySelector("[id^='request_table_div_']");
      if (!requestFrame) return;
      ensureMusicRequestEmptyState(requestFrame, rowCount);
    });
  }

  function decorateMusicTabPanels(tabPanels) {
    tabPanels.forEach((panel) => {
      const controlTable = findMusicControlTable(panel);
      const headerTable = Array.from(panel.querySelectorAll(":scope > table")).find((table) => table !== controlTable);
      if (controlTable) {
        controlTable.classList.add("djep-music-control-table");
        pruneMusicSpacerRows(controlTable);
        Array.from(controlTable.rows).forEach((row) => {
          const linkCount = row.querySelectorAll("a.djep-artistsongbuttons, a.djep-artistsongbuttonswide").length;
          if (linkCount >= 8) {
            row.classList.add("djep-music-alpha-row");
          }
          if (row.querySelector("input[type='text']") && row.querySelector(".djep-searchbutton")) {
            row.classList.add("djep-music-search-row");
          }
          if (row.querySelector("select") && row.querySelector(".djep-searchbutton")) {
            row.classList.add("djep-music-filter-row");
          }
        });
      }
      if (headerTable && headerTable.querySelector(".djep-databasetableheader")) {
        headerTable.classList.add("djep-music-results-header-table");
      }
    });
  }

  function normalizeMusicRequestHeaders(root, options = {}) {
    const { emptyText = "No songs yet", allowEmptyChip = true } = options;
    if (!root) return;
    root.querySelectorAll(".djep-playlistlimits").forEach((node) => {
      if (ensureSavedPlaylistEditControl(node)) return;
      if (node.querySelector(".djep-music-limit-chip")) return;

      const scratch = document.createElement("div");
      scratch.innerHTML = node.innerHTML.replace(/<br\s*\/?>/gi, "||DJEP_BREAK||");
      const normalizedText = cleanText(scratch.textContent || "");
      const parts = normalizedText
        .split("||DJEP_BREAK||")
        .map((part) => cleanText(part))
        .filter(Boolean);

      node.textContent = "";

      if (!parts.length) {
        if (!allowEmptyChip) {
          node.textContent = "";
          node.classList.add("djep-music-limit-empty");
          return;
        }

        node.classList.add("djep-music-limit-empty");
        const emptyChip = document.createElement("span");
        emptyChip.className = "djep-music-limit-chip djep-music-limit-chip-empty";
        emptyChip.textContent = emptyText;
        node.append(emptyChip);
        return;
      }

      node.classList.remove("djep-music-limit-empty");
      parts.forEach((part) => {
        const chip = document.createElement("span");
        chip.className = "djep-music-limit-chip";
        chip.textContent = part;
        node.append(chip);
      });
    });
  }

  function enhanceMusicDropTargets(requestsCell) {
    if (!requestsCell || !window.jQuery) return;
    requestsCell
      .querySelectorAll("[id^='request_table_div_'], [id^='request_table_title_div_']")
      .forEach((node) => {
        const dropInstance = jQuery(node).data("droppable");
        if (!dropInstance) return;
        jQuery(node).droppable("option", "hoverClass", "djep-music-drop-hover");
        jQuery(node).droppable("option", "activeClass", "djep-music-drop-active");
      });
  }

  function finalizeMusicPageSetup({
    requestsContent,
    requestsCell,
    requestsAccordion,
    requestLimitBox,
    queueMusicRequestMetaSync,
    refreshMusicEmptyStates,
    refreshMusicRequestViews,
  }) {
    syncMusicRequestMeta({ requestsContent, requestsCell, requestsAccordion, requestLimitBox });
    scheduleMusicRequestMetaRefresh(queueMusicRequestMetaSync);

    refreshMusicEmptyStates();
    refreshMusicRequestViews();
    convertTopHitsOptionsToDropdown();
    syncTopHitsPrimaryButtons();
  }

  function buildMusicShell({
    browserCell,
    requestsCell,
    tabs,
    requestsAccordion,
    requestLimitBox,
    successBanner,
    requestsTitle,
  }) {
    prepareMusicShellColumns({
      browserCell,
      requestsCell,
      tabs,
      requestsAccordion,
      requestLimitBox,
      successBanner,
    });

    ensureMusicShellHead(
      browserCell,
      "djep-music-browser-head",
      "Browse Library",
      "Search by artist, song title, charts, or genres."
    );
    ensureMusicShellHead(
      requestsCell,
      "djep-music-requests-head",
      "Your Request Lists",
      "Drag tracks into a list or click a saved song to edit it."
    );

    requestsTitle?.remove();
  }

  function installMusicBrowseEnhancements({
    form,
    tabs,
    musicBox,
    requestsContent,
    requestsCell,
    normalizeMusicRequestHeaders,
    refreshMusicEmptyStates,
    enhanceMusicDropTargets,
  }) {
    if (requestsCell) {
      normalizeMusicRequestHeaders();
      normalizeMusicPlaylistRows(requestsCell);
    }

    enhanceMusicDropTargets();
    installOfflineMusicMutationShim({
      requestsCell,
      normalizeMusicRequestHeaders,
      refreshMusicEmptyStates,
      enhanceMusicDropTargets,
    });
    patchTopHitsOptionFunctions(form);
    observeTopHitsHeader();
    keepTopHitsDropdownSynced(form, tabs);
    bindTopHitsTabDropdownRefresh(tabs);

    const instructions = removeMusicInstructionsAndSetPlaceholders({ musicBox, requestsContent, tabs });
    if (instructions) {
      instructions.classList.add("djep-music-instructions");
    }

    return instructions;
  }

  function initializeMusicSpotifyAndTabs({ tabs, tabsNav, requestsContent }) {
    const tabPanels = Array.from(tabs?.querySelectorAll(".djep-tabs-all") || []);

    initializeMusicTabsNav({ tabsNav, tabPanels });
    syncMusicTabLabels(tabsNav);
    applyMusicNavPills(tabsNav);
    forceActiveMusicNavState(tabsNav);

    const spotifyPanel = tabs?.querySelector("#tabs-7");
    const spotifyTracksPanel = spotifyPanel?.querySelector("#spotify-playlist-tracks");

    installSpotifyBehaviorPatch({ spotifyPanel, spotifyTracksPanel });
    bindSpotifyPlaylistResetWatcher(spotifyTracksPanel, requestsContent);
    decorateMusicTabPanels(tabPanels);

    return { tabPanels, spotifyPanel, spotifyTracksPanel };
  }

  function normalizeGuestSelectMusicHeading(heading, welcomeText) {
    if (!(heading instanceof HTMLElement)) return null;

    heading.classList.add("djep-guestmusic-heading", "djep-music-heading");

    let title = heading.querySelector(".djep-guestmusic-title");
    if (!(title instanceof HTMLElement)) {
      title = document.createElement("span");
      title.className = "djep-guestmusic-title djep-music-title";
      title.textContent = "Select Your Requests";

      Array.from(heading.childNodes).forEach((node) => {
        if (node === title) return;
        if (node.nodeType === Node.TEXT_NODE) {
          node.remove();
        }
      });

      heading.insertBefore(title, heading.firstChild || null);
    }
    title.classList.add("djep-guestmusic-title", "djep-music-title");

    const logoutLink = heading.querySelector(".djep-guestlogout");
    if (logoutLink instanceof HTMLElement) {
      logoutLink.classList.add("djep-readviewbutton", "djep-guestmusic-logout", "djep-music-header-button");
      logoutLink.textContent = "Log Off";
    }

    let subtitle = heading.parentElement?.querySelector(":scope > .djep-guestmusic-subtitle");
    if (!(subtitle instanceof HTMLElement)) {
      subtitle = document.createElement("div");
      subtitle.className = "djep-guestmusic-subtitle djep-music-subtitle";
      heading.insertAdjacentElement("afterend", subtitle);
    }
    subtitle.classList.add("djep-guestmusic-subtitle", "djep-music-subtitle");

    subtitle.textContent =
      cleanText(welcomeText) ||
      "Add songs by tapping Select or dragging them into your request list, then submit when you're done.";

    return subtitle;
  }

  const MUSIC_HELPER_ELEMENT_IDS = new Set([
    "warning_div",
    "preview_song_modal_div",
    "edit_song_div",
    "confirm_song_deletion_div",
    "confirm_playlist_deletion_div",
    "edit_playlist_window",
    "clientIDspan",
    "hidden_request_type_options_id",
    "hidden_special_song_type_options_id",
    "hidden_request_type_maximums_id",
    "hidden_request_type_titles_id",
    "hidden_request_maximum_total_id",
  ]);

  function isolateMusicHelperInfrastructure({ form, musicBox, layoutTable, heading }) {
    if (!(form instanceof HTMLElement) || !(musicBox instanceof HTMLElement) || !(layoutTable instanceof HTMLElement)) {
      return;
    }

    let helperHost = form.querySelector(":scope > .djep-music-helper-host");
    if (!(helperHost instanceof HTMLElement)) {
      helperHost = document.createElement("div");
      helperHost.className = "djep-music-helper-host";
      helperHost.style.display = "contents";
    }

    const helperNodes = [];
    Array.from(form.children).forEach((child) => {
      if (child === heading || child === musicBox || child === helperHost) return;
      helperNodes.push(child);
    });

    Array.from(musicBox.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (child === layoutTable || child.id === "alert_message_div") return;

      const inputType = (child.getAttribute("type") || "").toLowerCase();
      const isHiddenInput = child.tagName === "INPUT" && inputType === "hidden";
      const isHelperNode = MUSIC_HELPER_ELEMENT_IDS.has(child.id);
      const isInlineScript = child.tagName === "SCRIPT";
      const isSpacerNode =
        child.tagName === "BR" ||
        child.classList.contains("cf") ||
        (child.tagName === "DIV" && !cleanText(child.textContent || "") && child.children.length === 0);

      if (isSpacerNode) {
        child.remove();
        return;
      }

      if (isHiddenInput || isHelperNode || isInlineScript) {
        helperNodes.push(child);
      }
    });

    if (!helperNodes.length) {
      helperHost.remove();
      return;
    }

    helperHost.append(...helperNodes);
    if (helperHost.parentElement !== form) {
      form.append(helperHost);
    }
  }

  function isolateGuestMusicHelperInfrastructure({ form, musicBox, primaryNodes = [], preservedNodes = [] }) {
    if (!(form instanceof HTMLElement) || !(musicBox instanceof HTMLElement)) return null;

    let helperHost = form.querySelector(":scope > .djep-music-helper-host");
    if (!(helperHost instanceof HTMLElement)) {
      helperHost = document.createElement("div");
      helperHost.className = "djep-music-helper-host djep-guestmusic-helper-host";
      helperHost.hidden = true;
      helperHost.setAttribute("aria-hidden", "true");
    }

    const retainedNodes = new Set(primaryNodes.filter(Boolean));
    const preserved = new Set(preservedNodes.filter(Boolean));
    const helperNodes = [];

    Array.from(form.children).forEach((child) => {
      if (child === musicBox || child === helperHost) return;
      if (preserved.has(child)) return;
      helperNodes.push(child);
    });

    Array.from(musicBox.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (retainedNodes.has(child) || child.id === "alert_message_div") return;

      const inputType = (child.getAttribute("type") || "").toLowerCase();
      const isHiddenInput = child.tagName === "INPUT" && inputType === "hidden";
      const isHelperNode = MUSIC_HELPER_ELEMENT_IDS.has(child.id) || child.id === "djIDspan";
      const isInlineScript = child.tagName === "SCRIPT";
      const isTextareaHelper = child.tagName === "TEXTAREA" && !child.closest("#edit_song_div");
      const isSpacerNode =
        child.tagName === "BR" ||
        child.classList.contains("cf") ||
        (child.tagName === "DIV" && !cleanText(child.textContent || "") && child.children.length === 0);

      if (isSpacerNode) {
        child.remove();
        return;
      }

      if (isHiddenInput || isHelperNode || isInlineScript || isTextareaHelper) {
        helperNodes.push(child);
      }
    });

    if (!helperNodes.length) {
      helperHost.remove();
      return null;
    }

    helperHost.replaceChildren(...helperNodes);
    if (helperHost.parentElement !== form) {
      form.append(helperHost);
    }

    return helperHost;
  }

  function hideGuestMusicAlphaRows(tabs) {
    if (!(tabs instanceof HTMLElement)) return;
    tabs.querySelectorAll("#tabs-1 > table:first-of-type > tbody > tr, #tabs-2 > table:first-of-type > tbody > tr").forEach((row) => {
      if (!(row instanceof HTMLTableRowElement)) return;
      if (!row.querySelector("a.djep-artistsongbuttons")) return;
      row.style.display = "none";
    });
  }

  function initGuestSelectMusicPage() {
    const content = document.getElementById("djep-content");
    const form = content?.querySelector('form[name="ep_form"]');
    const heading = form?.querySelector(":scope > h2.djep-h2");
    const musicBox = form?.querySelector(":scope > .djep-selectyourmusicbox, :scope > .djep-music-panel");
    if (!content || !form || !heading || !musicBox || form.dataset.djepGuestSelectMusicInit === "1") return;

    const browserColumn = musicBox.querySelector(":scope > .col-xs-12.col-md-7");
    const requestsColumn = musicBox.querySelector(":scope > .col-xs-12.col-md-5");
    const tabs = browserColumn?.querySelector("#tabs");
    const tabsNav = tabs?.querySelector("#tabs_hider_helper") || tabs?.querySelector(".ui-tabs-nav");
    const requestsContent = requestsColumn?.querySelector("#your_requests_content");
    const requestDropZone = requestsContent?.querySelector("#request_table_div_GRQ");
    if (!browserColumn || !requestsColumn || !tabs || !requestsContent || !requestDropZone) return;

    form.dataset.djepGuestSelectMusicInit = "1";
    form.classList.add("djep-guestmusic-form");
    document.body.classList.add("djep-guestmusicpage-ready", "djep-musicpage-ready");

    musicBox.classList.remove("djep-selectyourmusicbox");
    musicBox.classList.add("djep-music-panel", "djep-guestmusic-panel");

    const guestWelcome = musicBox.querySelector("#guest_welcometext");
    const subtitle = normalizeGuestSelectMusicHeading(heading, guestWelcome?.textContent || "");
    guestWelcome?.remove();

    browserColumn.classList.add("djep-music-browser-column", "djep-guestmusic-browser-column");
    requestsColumn.classList.add("djep-music-requests-column", "djep-guestmusic-requests-column");
    tabs.classList.add("djep-music-browser-shell", "djep-guestmusic-tabs");

    ensureMusicShellHead(
      browserColumn,
      "djep-music-browser-head",
      "Browse Songs",
      "Search by artist, title, top hits, or other guest requests."
    );
    ensureMusicShellHead(
      requestsColumn,
      "djep-music-requests-head",
      "Your Requests",
      "Build your request list and submit it when you're ready."
    );

    requestsColumn.querySelector(".djep-requestonlytitle")?.remove();
    requestsColumn.querySelectorAll(":scope > .cf, :scope > div[style*='height']").forEach((node) => {
      if (!cleanText(node.textContent || "") && node.children.length === 0) {
        node.remove();
      }
    });

    const submitButton = requestsColumn.querySelector("a.djep-guestsubmit");
    const submitWrap = submitButton?.parentElement;
    submitWrap?.classList.add("djep-guestmusic-submit-wrap");
    submitButton?.classList.add("djep-actionbutton", "djep-guestmusic-submit");
    submitButton?.setAttribute("role", "button");

    requestsContent.classList.add("djep-guestmusic-request-content");
    requestDropZone.classList.add("djep-guestmusic-dropzone");

    const guestRequestContainer = requestsContent.querySelector("#guest_request_container");
    if (guestRequestContainer instanceof HTMLElement) {
      guestRequestContainer.classList.add("djep-guestmusic-dropcopy");
      if (!requestDropZone.querySelector(".djep-playlistitemsaved")?.textContent?.trim()) {
        guestRequestContainer.innerHTML = "<span>Drag songs here or tap <strong>Select</strong> to add them to your request list.</span>";
      }
    }

    requestsContent.querySelector("#submit_guest_request_button_box")?.remove();

    const tabsPanels = Array.from(tabs.querySelectorAll(".djep-tabs-all"));
    syncMusicTabLabels(tabsNav);
    applyMusicNavPills(tabsNav);
    forceActiveMusicNavState(tabsNav);
    decorateMusicTabPanels(tabsPanels);
    hideGuestMusicAlphaRows(tabs);
    patchTopHitsOptionFunctions(form);
    observeTopHitsHeader();
    keepTopHitsDropdownSynced(form, tabs);
    bindTopHitsTabDropdownRefresh(tabs);
    convertTopHitsOptionsToDropdown();
    syncTopHitsPrimaryButtons();

    let layout = musicBox.querySelector(":scope > .djep-guestmusic-layout");
    if (!(layout instanceof HTMLElement)) {
      layout = document.createElement("div");
      layout.className = "djep-guestmusic-layout";
    }

    isolateGuestMusicHelperInfrastructure({
      form,
      musicBox,
      primaryNodes: [browserColumn, requestsColumn],
      preservedNodes: [heading, subtitle],
    });

    layout.replaceChildren(browserColumn, requestsColumn);
    musicBox.replaceChildren(layout);
    const helperNodes = Array.from(form.querySelectorAll(":scope > .djep-guestmusic-helper-host"));
    form.replaceChildren(musicBox, ...helperNodes);
    content.replaceChildren(
      heading,
      ...(subtitle instanceof HTMLElement ? [subtitle] : []),
      form
    );
  }

  function initializeMusicTabsNav({
    tabsNav,
    tabPanels,
  }) {
    if (!(tabsNav instanceof HTMLElement) || tabsNav.dataset.djepMusicNavInit === "1") return;
    tabsNav.dataset.djepMusicNavInit = "1";
    syncMusicTabLabels(tabsNav);

    Array.from(tabsNav.children).forEach((item) => {
      const label = cleanText(item.textContent || "");
      item.classList.remove("djep-music-tab-primary", "djep-music-tab-utility", "djep-music-tab-spotify");
      if (item.querySelector("img")) {
        item.classList.add("djep-music-tab-spotify");
        const anchor = item.querySelector("a");
        if (anchor && anchor.dataset.djepSpotifyBound !== "1") {
          anchor.dataset.djepSpotifyBound = "1";
          anchor.removeAttribute("onclick");
          anchor.onclick = null;
          anchor.addEventListener("click", (event) => {
            event.preventDefault();
            showMusicTab({ item, tabsNav, tabPanels });
            if (typeof window.loadSpotifyInterface === "function") {
              window.loadSpotifyInterface();
            }
          });
        }
        return;
      }
      if (label === "Add Your Own" || label === "ADD YOUR OWN") {
        item.classList.add("djep-music-tab-utility");
        const anchor = item.querySelector("a");
        if (anchor) {
          anchor.textContent = "ADD YOUR OWN";
          if (anchor.dataset.djepAddYourOwnBound !== "1") {
            anchor.dataset.djepAddYourOwnBound = "1";
            anchor.addEventListener(
              "click",
              (event) => {
                event.preventDefault();
                showMusicTab({ item, tabsNav, tabPanels });
                if (typeof window.jsCheckForMaximumRequests === "function") {
                  window.jsCheckForMaximumRequests();
                }
                if (typeof window.jsPopulateAddYourOwnRequestTypeSelect === "function") {
                  window.jsPopulateAddYourOwnRequestTypeSelect();
                }
                if (typeof window.jsExpandRequestDiv === "function") {
                  window.jsExpandRequestDiv();
                }
              },
              true
            );
          }
        }
        return;
      }
      item.classList.add("djep-music-tab-primary");
    });

    tabsNav.addEventListener("click", () => {
      window.setTimeout(() => {
        syncMusicTabLabels(tabsNav);
        applyMusicNavPills(tabsNav);
        forceActiveMusicNavState(tabsNav);
      }, 0);
    });
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(".djep-music-request-switcher")) return;
      window.setTimeout(() => {
        applyMusicNavPills(tabsNav);
        forceActiveMusicNavState(tabsNav);
      }, 0);
      window.setTimeout(() => forceActiveMusicNavState(tabsNav), 120);
    });
  }

  function normalizeMusicAccordionWidths(accordion) {
    if (!(accordion instanceof HTMLElement) || !isMobileViewport() || !isForcedMobileShellActive()) return;

    accordion.removeAttribute("width");
    accordion.style.width = "100%";
    accordion.style.maxWidth = "100%";
    accordion.style.margin = "0";

    accordion
      .querySelectorAll(
        ':scope > .ui-accordion-header, :scope > .ui-accordion-content, [id^="request_table_div_"], table, tbody, tr, td'
      )
      .forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        node.removeAttribute("width");

        if (
          node.matches(':scope > .ui-accordion-header, :scope > .ui-accordion-content, [id^="request_table_div_"], table')
        ) {
          node.style.width = "100%";
          node.style.maxWidth = "100%";
        }

        if (node.style.marginLeft === "auto" || node.style.marginRight === "auto") {
          node.style.margin = "0";
        }
      });
  }

  function normalizeMusicMobileLayout({ heading, musicBox, browserCell, requestsCell, tabs, requestsContent }) {
    if (!isMobileViewport() || !isForcedMobileShellActive()) return;

    [heading, musicBox, browserCell, requestsCell, tabs, requestsContent].forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.width = "";
      node.style.maxWidth = "";
      node.style.minWidth = "";
    });

    if (requestsContent instanceof HTMLElement) {
      requestsContent.style.gridTemplateColumns = "minmax(0, 1fr)";

      Array.from(requestsContent.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        child.style.width = "100%";
        child.style.maxWidth = "100%";
        child.style.minWidth = "0";
        child.style.justifySelf = "stretch";
      });
    }

    normalizeMusicAccordionWidths(requestsCell?.querySelector("#requests_accordion"));
    normalizeMusicAccordionWidths(requestsCell?.querySelector("#saved_playlists_accordion"));
  }

  function ensureMusicRequestMobileRuntimeStyles() {
    upsertRuntimeStyle(
      "djep-music-request-mobile-runtime",
      `
@media (max-width: 767px) {
body.djep-force-mobile-shell.djep-musicpage-ready .djep-music-request-categories {
  display: flex !important;
  gap: 6px !important;
  overflow-x: auto !important;
  margin: 0 !important;
  padding: 2px 0 4px !important;
  scrollbar-width: none !important;
  scroll-snap-type: x proximity !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready .djep-music-request-categories::-webkit-scrollbar { display: none !important; }
body.djep-force-mobile-shell.djep-musicpage-ready .djep-music-request-category {
  flex: 0 0 auto !important;
  display: grid !important;
  gap: 3px !important;
  min-height: 40px !important;
  padding: 8px 12px !important;
  border: 1px solid rgba(216, 223, 235, 0.96) !important;
  border-radius: 14px !important;
  background: #ffffff !important;
  color: #243049 !important;
  text-align: left !important;
  box-shadow: 0 6px 14px rgba(17, 26, 46, 0.05) !important;
  scroll-snap-align: start !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready .djep-music-request-category.is-active {
  border-color: rgba(208, 49, 148, 0.28) !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(253, 244, 250, 0.98) 100%) !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready .djep-music-request-category-label {
  color: #101729 !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  line-height: 1.3 !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready .djep-music-request-category-meta {
  color: #667085 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  line-height: 1.35 !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion { display: grid !important; gap: 12px !important; }
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-header {
  position: relative !important;
  display: grid !important;
  gap: 8px !important;
  margin: 0 !important;
  padding: 12px 14px !important;
  border: 1px solid rgba(219, 227, 239, 0.96) !important;
  border-radius: 18px !important;
  background: rgba(255, 255, 255, 0.98) !important;
  box-shadow: 0 8px 18px rgba(17, 26, 46, 0.05) !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-header .ui-accordion-header-icon {
  position: absolute !important; top: 17px !important; right: 14px !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-header .djep-playlisttitle {
  display: block !important; padding-right: 28px !important; color: #101729 !important; font-size: 16px !important; font-weight: 800 !important; line-height: 1.3 !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-header .djep-playlistlimits {
  display: flex !important; flex-wrap: wrap !important; gap: 6px !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-content {
  margin: -4px 0 0 !important; padding: 0 0 6px !important; border: 0 !important; background: transparent !important; overflow: visible !important; height: auto !important; max-height: none !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-content > table,
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-content > table > tbody,
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-content > table > tbody > tr,
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-content > table > tbody > tr > td,
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-playlist-listing,
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-playlist-listing > tbody {
  display: block !important; width: 100% !important; max-width: 100% !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-content > table > tbody > tr > td { padding: 0 !important; }
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion > .ui-accordion-content > [id^="request_table_div_"] {
  height: auto !important; max-height: min(52vh, 360px) !important; overflow-y: auto !important; overflow-x: hidden !important; overscroll-behavior: contain !important; scrollbar-gutter: stable !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important; padding: 0 0 2px !important; border: 0 !important; background: transparent !important; box-shadow: none !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-playlist-row {
  display: block !important; width: 100% !important; margin: 0 0 8px !important; border: 1px solid rgba(216, 223, 235, 0.96) !important; border-radius: 14px !important; background: #ffffff !important; box-shadow: 0 6px 14px rgba(17, 26, 46, 0.05) !important; cursor: pointer !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-playlist-row:last-child { margin-bottom: 0 !important; }
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-playlist-primary-cell {
  display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important; gap: 8px 10px !important; align-items: center !important; width: 100% !important; padding: 12px 14px !important; box-sizing: border-box !important; border: 0 !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-playlist-line { display: grid !important; gap: 3px !important; min-width: 0 !important; }
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-playlist-song { color: #101729 !important; font-size: 14px !important; font-weight: 800 !important; line-height: 1.35 !important; }
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-playlist-separator { display: none !important; }
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-playlist-artist { color: #667085 !important; font-size: 12px !important; font-weight: 600 !important; line-height: 1.5 !important; }
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-request-edit-hint {
  display: inline-flex !important; align-items: center !important; width: fit-content !important; min-height: 24px !important; padding: 0 8px !important; border-radius: 999px !important; background: #f8fafc !important; color: #344054 !important; font-size: 10px !important; font-weight: 800 !important; letter-spacing: 0.04em !important; text-transform: uppercase !important; justify-self: end !important; white-space: nowrap !important;
}
body.djep-force-mobile-shell.djep-musicpage-ready #requests_accordion .djep-music-request-empty { margin-top: 8px !important; }
}
      `.trim()
    );
  }

  function getMusicRequestGroups(requestsAccordion) {
    if (!(requestsAccordion instanceof HTMLElement)) return [];
    return Array.from(requestsAccordion.querySelectorAll(":scope > .ui-accordion-header")).map((header, index) => {
      const chips = Array.from(header.querySelectorAll(".djep-music-limit-chip"))
        .map((node) => cleanText(node.textContent || ""))
        .filter(Boolean);
      return {
        index,
        header,
        panel: header.nextElementSibling instanceof HTMLElement ? header.nextElementSibling : null,
        title:
          cleanText(header.querySelector(".djep-playlisttitle")?.textContent || "") ||
          cleanText(header.textContent || "") ||
          `Request List ${index + 1}`,
        meta: chips.join(" · "),
        active:
          header.classList.contains("ui-state-active") ||
          header.classList.contains("ui-accordion-header-active") ||
          header.getAttribute("aria-selected") === "true",
      };
    });
  }

  function ensureMusicRequestCategoryNav({ requestsContent, requestsAccordion, refreshMusicRequestMobilePresentation }) {
    if (!isForcedMobileShellActive()) {
      requestsContent?.querySelector(":scope > .djep-music-request-categories")?.remove();
      return null;
    }
    if (!(requestsContent instanceof HTMLElement) || !(requestsAccordion instanceof HTMLElement)) return null;
    let nav = requestsContent.querySelector(":scope > .djep-music-request-categories");
    if (!(nav instanceof HTMLElement)) {
      nav = document.createElement("nav");
      nav.className = "djep-music-request-categories";
      nav.setAttribute("aria-label", "Request categories");
    }
    if (requestsAccordion.parentElement === requestsContent) {
      requestsContent.insertBefore(nav, requestsAccordion);
    } else if (!nav.parentElement) {
      requestsContent.append(nav);
    }
    if (bindDatasetOnce(nav, "djepMusicRequestCategoriesBound")) {
      nav.addEventListener("click", (event) => {
        const button = event.target.closest(".djep-music-request-category");
        if (!(button instanceof HTMLButtonElement)) return;
        const index = Number(button.dataset.requestIndex);
        if (!Number.isFinite(index)) return;
        const groups = getMusicRequestGroups(requestsAccordion);
        const targetGroup = groups.find((group) => group.index === index);
        if (!targetGroup?.header) return;
        event.preventDefault();
        if (window.jQuery) {
          try { window.jQuery(requestsAccordion).accordion("option", "active", index); }
          catch (error) { targetGroup.header.click(); }
        } else {
          targetGroup.header.click();
        }
        runAfterDelays(() => {
          targetGroup.header.scrollIntoView({ block: "nearest", behavior: "smooth" });
          refreshMusicRequestMobilePresentation();
        }, [80]);
      });
    }
    return nav;
  }

  function createMusicRequestMobilePresentationRefresher({ requestsContent, requestsAccordion }) {
    return function refreshMusicRequestMobilePresentation() {
      if (!isMobileViewport() || !isForcedMobileShellActive() || !(requestsContent instanceof HTMLElement) || !(requestsAccordion instanceof HTMLElement)) {
        requestsContent?.querySelector(":scope > .djep-music-request-categories")?.remove();
        return;
      }
      ensureMusicRequestMobileRuntimeStyles();
      const currentView = requestsContent.dataset.djepMusicRequestView || "requests";
      const categoryNav = ensureMusicRequestCategoryNav({ requestsContent, requestsAccordion, refreshMusicRequestMobilePresentation });
      if (categoryNav instanceof HTMLElement) categoryNav.hidden = currentView !== "requests";
      if (currentView !== "requests") return;

      const groups = getMusicRequestGroups(requestsAccordion);
      if (!groups.length) {
        if (categoryNav instanceof HTMLElement) categoryNav.hidden = true;
        return;
      }

      const activeIndex = groups.find((group) => group.active)?.index ?? 0;
      if (categoryNav instanceof HTMLElement) {
        categoryNav.innerHTML = "";
        groups.forEach((group) => {
          const button = document.createElement("button");
          const label = document.createElement("span");
          const meta = document.createElement("span");
          button.type = "button";
          button.className = "djep-music-request-category";
          button.dataset.requestIndex = String(group.index);
          button.classList.toggle("is-active", group.index === activeIndex);
          label.className = "djep-music-request-category-label";
          label.textContent = group.title;
          meta.className = "djep-music-request-category-meta";
          meta.textContent = group.meta || "Tap to review";
          button.append(label, meta);
          categoryNav.append(button);
        });
      }

      groups.forEach((group) => {
        group.header.dataset.djepRequestIndex = String(group.index);
        group.panel?.setAttribute("data-djep-request-index", String(group.index));
        if (group.panel instanceof HTMLElement) {
          group.panel.style.setProperty("height", "auto", "important");
          group.panel.style.setProperty("max-height", "none", "important");
          group.panel.style.setProperty("overflow", "visible", "important");
        }
        const requestFrame = group.panel?.querySelector("[id^='request_table_div_']");
        if (requestFrame instanceof HTMLElement && group.panel instanceof HTMLElement) {
          const legacyWrapper = Array.from(group.panel.children).find((child) => child instanceof HTMLElement && child !== requestFrame && child.contains(requestFrame));
          if (legacyWrapper instanceof HTMLElement) {
            group.panel.insertBefore(requestFrame, legacyWrapper);
            legacyWrapper.remove();
          }
          requestFrame.style.setProperty("height", "auto", "important");
          requestFrame.style.setProperty("max-height", "min(52vh, 360px)", "important");
          requestFrame.style.setProperty("overflow", "auto", "important");
          requestFrame.style.setProperty("overflow-y", "auto", "important");
          requestFrame.style.setProperty("overflow-x", "hidden", "important");
          requestFrame.style.setProperty("width", "100%", "important");
          requestFrame.style.webkitOverflowScrolling = "touch";
          requestFrame.style.touchAction = "pan-y";
        }
        group.panel?.querySelectorAll(".djep-playlist-listing tr").forEach((row) => {
          if (!(row instanceof HTMLTableRowElement)) return;
          row.classList.add("djep-music-playlist-row");
          row.tabIndex = 0;
          row.setAttribute("role", "button");
          const songTitle = cleanText(row.dataset.djepMusicSongTitle || row.querySelector(".djep-music-playlist-song")?.textContent || "song");
          const artistName = cleanText(row.dataset.djepMusicArtist || row.querySelector(".djep-music-playlist-artist")?.textContent || "");
          row.setAttribute("aria-label", `Edit ${songTitle}${artistName ? ` by ${artistName}` : ""}`);
          if (row.dataset.djepMusicRowKeyBound !== "1") {
            row.dataset.djepMusicRowKeyBound = "1";
            row.addEventListener("keydown", (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              row.click();
            });
          }
          const primaryCell = row.querySelector(".djep-music-playlist-primary-cell, td");
          if (!(primaryCell instanceof HTMLElement) || primaryCell.querySelector(".djep-music-request-edit-hint")) return;
          const hint = document.createElement("span");
          hint.className = "djep-music-request-edit-hint";
          hint.textContent = "Tap to edit";
          primaryCell.append(hint);
        });
      });
    };
  }

  function ensureProfileSmsBox(content, loginColumn) {
    if (!(content instanceof HTMLElement) || !(loginColumn instanceof HTMLElement)) {
      return { smsBox: null, smsTitle: null, smsTable: null };
    }

    let smsBox = loginColumn.querySelector(".djep-profile-smsbox");
    const smsTitle = Array.from(content.querySelectorAll(".djep-titlebarsmall")).find((node) =>
      /sms notification consent/i.test(cleanText(node.textContent || ""))
    );
    const smsTable = Array.from(content.querySelectorAll("table")).find((table) =>
      table.querySelector('input[name="optin_optout_sms"]')
    );

    if (!smsBox && (smsTitle || smsTable)) {
      smsBox = document.createElement("div");
      smsBox.className = "djep-profile-panel djep-profile-smsbox";
      loginColumn.append(smsBox);
    }

    if (smsBox) {
      if (smsTitle && smsTitle.parentElement !== smsBox) {
        smsBox.append(smsTitle);
      }
      if (smsTable && smsTable.parentElement !== smsBox) {
        smsBox.append(smsTable);
      }
    }

    return { smsBox, smsTitle, smsTable };
  }

  function normalizeProfileGroups(root, options) {
    if (!(root instanceof HTMLElement) || root.querySelector(".djep-profile-groups")) return;
    const table = root.querySelector("table");
    const groups = buildProfileFieldGroups(table, options);
    if (table && groups) table.replaceWith(groups);
    root.querySelectorAll("br").forEach((node) => node.remove());
  }

  function mountProfilePanelActions(loginForm) {
    if (!(loginForm instanceof HTMLElement) || loginForm.querySelector(".djep-profile-panel-actions")) return;

    const externalActionIds = ["change_password_link_row", "save_password_link_row", "password_save_confirmation"];
    const externalRows = externalActionIds.map((id) => loginForm.querySelector(`#${id}`)).filter(Boolean);
    if (!externalRows.length) return;

    const actionWrap = document.createElement("div");
    actionWrap.className = "djep-profile-panel-actions";
    externalRows.forEach((row) => actionWrap.append(row));
    loginForm.append(actionWrap);
  }

  function requestProfileSmsConsentUpdate(nextValue) {
    const updateUrl = `profile.asp?action=ajax_update_sms_consent_in_client_portal&opt_in_out=${encodeURIComponent(nextValue)}`;
    const handleSuccess = (result) => {
      if (cleanText(result || "") !== "OK") {
        throw new Error("Unexpected SMS consent response");
      }
      if (typeof window.go === "function") {
        window.go("profile.asp?sms_consent_updated=true");
      } else {
        window.location.assign("profile.asp?sms_consent_updated=true");
      }
    };

    if (typeof window.jQuery?.ajax === "function") {
      return new Promise((resolve, reject) => {
        window.jQuery.ajax({
          url: updateUrl,
          success: resolve,
          error: reject,
        });
      }).then(handleSuccess);
    }

    return window
      .fetch(new URL(updateUrl, window.location.href).toString(), {
        credentials: "same-origin",
      })
      .then((response) => response.text())
      .then(handleSuccess);
  }

  function initializeProfileSmsConsent({ content, loginBox, smsBox }) {
    if (!(content instanceof HTMLElement) || !(loginBox instanceof HTMLElement) || !(smsBox instanceof HTMLElement)) return;

    const syncSmsToggleState = () => {
      smsBox.querySelectorAll(".djep-profile-field-controls.is-choice").forEach((controls) => {
        const radios = Array.from(controls.querySelectorAll('input[name="optin_optout_sms"]'));
        const optInRadio = radios.find((input) => input.value === "optin") || radios[0] || null;
        const optOutRadio =
          radios.find((input) => input.value === "optout") || radios.find((input) => input !== optInRadio) || null;
        if (!optInRadio || !optOutRadio) return;

        let legacyInputs = controls.querySelector(".djep-profile-sms-legacy-inputs");
        if (!legacyInputs) {
          legacyInputs = document.createElement("div");
          legacyInputs.className = "djep-profile-sms-legacy-inputs";
          Array.from(controls.childNodes).forEach((node) => legacyInputs.append(node));
          controls.append(legacyInputs);
        }

        let toggle = controls.querySelector(".djep-profile-sms-toggle");
        let checkbox = toggle?.querySelector('input[type="checkbox"]') || null;

        if (!toggle || !(checkbox instanceof HTMLInputElement)) {
          toggle = document.createElement("label");
          toggle.className = "djep-profile-sms-toggle";

          checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "djep-profile-sms-toggle-input";

          const toggleBody = document.createElement("span");
          toggleBody.className = "djep-profile-sms-toggle-body";

          const toggleTitle = document.createElement("span");
          toggleTitle.className = "djep-profile-sms-toggle-title";
          toggleTitle.textContent = "Enable SMS notifications";

          toggleBody.append(toggleTitle);

          const toggleSwitch = document.createElement("span");
          toggleSwitch.className = "djep-profile-sms-toggle-switch";

          toggle.append(checkbox, toggleBody, toggleSwitch);
          controls.append(toggle);
        }

        Array.from(controls.childNodes).forEach((node) => {
          if (node === legacyInputs || node === toggle) return;
          legacyInputs.append(node);
        });

        const checked = radios.find((input) => input.checked) || optInRadio;
        const isOptedIn = checked.value !== "optout";

        controls.dataset.djepChoiceValue = isOptedIn ? "optin" : "optout";
        checkbox.checked = isOptedIn;
        toggle.classList.toggle("is-on", isOptedIn);

        radios.forEach((input) => {
          if (input.dataset.djepSmsSyncBound === "1") return;
          input.dataset.djepSmsSyncBound = "1";
          input.addEventListener("change", syncSmsToggleState);
        });

        if (checkbox.dataset.djepSmsToggleBound === "1") return;
        checkbox.dataset.djepSmsToggleBound = "1";
        checkbox.addEventListener("change", () => {
          if (checkbox.dataset.djepSmsRequestPending === "1") return;

          const previousValue = controls.dataset.djepChoiceValue === "optout" ? "optout" : "optin";
          const nextValue = checkbox.checked ? "optin" : "optout";
          if (nextValue === previousValue) {
            syncSmsToggleState();
            return;
          }

          checkbox.dataset.djepSmsRequestPending = "1";
          checkbox.disabled = true;
          toggle.classList.add("is-pending");

          optInRadio.checked = nextValue === "optin";
          optOutRadio.checked = nextValue === "optout";
          syncSmsToggleState();

          requestProfileSmsConsentUpdate(nextValue)
            .catch(() => {
              optInRadio.checked = previousValue === "optin";
              optOutRadio.checked = previousValue === "optout";
              syncSmsToggleState();
              window.alert("Something went wrong when updating your SMS notification consent. Please try again.");
            })
            .finally(() => {
              delete checkbox.dataset.djepSmsRequestPending;
              checkbox.disabled = false;
              toggle.classList.remove("is-pending");
            });
        });
      });
    };

    const removeSmsLegacyRows = () => {
      content.querySelectorAll('input[name="optin_optout_sms"]').forEach((input) => {
        const row = input.closest("tr");
        const table = input.closest("table");

        if (row && !smsBox.contains(row)) {
          row.remove();
        } else if (table && !smsBox.contains(table)) {
          table.remove();
        }
      });

      content.querySelectorAll(".djep-titlebarsmall").forEach((titlebar) => {
        if (!/sms notification consent/i.test(cleanText(titlebar.textContent || ""))) return;
        if (smsBox.contains(titlebar)) return;
        titlebar.remove();
      });

      content.querySelectorAll("#alert_message_div, #alert_message2_div, .djep-titlebarconfirm").forEach((node) => {
        const text = cleanText(node.textContent || "");
        if (!/sms consent|consent choice was updated/i.test(text)) return;
        const removable = node.closest(".djep-profile-confirmation-row") || node.closest("tr") || node.closest("div") || node;
        removable.remove();
      });

      loginBox.querySelectorAll("tr, div, p, span").forEach((node) => {
        const text = cleanText(node.textContent || "");
        if (!/sms consent|consent choice was updated/i.test(text)) return;
        if (/sms notification consent/i.test(text)) return;
        if (node.querySelector('input[name="optin_optout_sms"]')) return;
        const removable = node.closest(".djep-profile-confirmation-row") || node.closest("tr") || node.closest("div") || node;
        removable.remove();
      });

      const url = new URL(window.location.href);
      if (url.searchParams.has("sms_consent_updated")) {
        url.searchParams.delete("sms_consent_updated");
        const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash;
        window.history.replaceState({}, "", next);
      }
    };

    removeSmsLegacyRows();
    syncSmsToggleState();

    if (loginBox.dataset.djepSmsObserverBound === "1") return;
    loginBox.dataset.djepSmsObserverBound = "1";

    let smsCleanupScheduled = false;
    const scheduleSmsCleanup = () => {
      if (smsCleanupScheduled) return;
      smsCleanupScheduled = true;
      window.requestAnimationFrame(() => {
        smsCleanupScheduled = false;
        removeSmsLegacyRows();
        syncSmsToggleState();
      });
    };

    const observer = new MutationObserver(scheduleSmsCleanup);
    observer.observe(loginBox, { childList: true, subtree: true });
    observer.observe(smsBox, { childList: true, subtree: true });
  }

  function mountProfileWorkspace(content, heading, contactColumn, loginColumn) {
    if (!(content instanceof HTMLElement)) return;

    const workspace = document.createElement("div");
    workspace.className = "djep-profile-workspace";

    if (contactColumn) workspace.append(contactColumn);
    if (loginColumn) workspace.append(loginColumn);

    const nextChildren = [];
    if (heading instanceof HTMLElement) {
      nextChildren.push(heading);
    }
    nextChildren.push(workspace);
    content.replaceChildren(...nextChildren);
  }

  function buildContactFormGrid(table) {
    if (!(table instanceof HTMLElement)) return null;

    const formGrid = document.createElement("div");
    formGrid.className = "djep-contact-form-grid";

    Array.from(table.querySelectorAll("tr")).forEach((row) => {
      const cells = Array.from(row.cells || []);
      if (cells.length < 2) return;

      const controlCell = cells[cells.length - 1];
      const control = controlCell.querySelector("input, textarea, select, button");
      if (!control) return;

      control.style.width = "";
      if (control.tagName === "TEXTAREA") {
        control.style.maxWidth = "";
        autosizeTextarea(control);
      }

      if (control.matches('input[type="submit"], button[type="submit"], .djep-widgetaction, .djep-actionbutton')) {
        const actions = document.createElement("div");
        actions.className = "djep-contact-form-actions";
        actions.append(control);
        formGrid.append(actions);
        return;
      }

      const field = document.createElement("div");
      field.className = "djep-contact-form-row";
      if (control.tagName === "TEXTAREA") {
        field.classList.add("is-message");
      }

      const label = document.createElement("div");
      label.className = "djep-contact-form-label";
      label.textContent = cleanText(cells[0].textContent).replace(/:$/, "");

      const controlWrap = document.createElement("div");
      controlWrap.className = "djep-contact-form-control";
      controlWrap.append(control);

      field.append(label, controlWrap);
      formGrid.append(field);
    });

    return formGrid;
  }

  function mountContactWorkspace(content, heading, formColumn, infoColumn) {
    if (!(content instanceof HTMLElement)) return;

    const workspace = document.createElement("div");
    workspace.className = "djep-contact-workspace";

    if (formColumn) workspace.append(formColumn);
    if (infoColumn) workspace.append(infoColumn);

    const nextChildren = [];
    if (heading instanceof HTMLElement) {
      nextChildren.push(heading);
    }
    nextChildren.push(workspace);
    content.replaceChildren(...nextChildren);
  }

  function initHomePage() {
    const content = document.getElementById("djep-content");
    const welcomeBox = content?.querySelector(".djep-welcometextbox");
    const eventListBoxes = Array.from(content?.querySelectorAll(".djep-eventlistbox") || []);
    if (!content || (!welcomeBox && !eventListBoxes.length)) return;

    document.body.classList.add("djep-homepage-ready");
    content.querySelectorAll(":scope > .djep-cleared, :scope > br").forEach((node) => node.remove());

    const welcomeShell = buildHomeWelcomeShell(welcomeBox);
    const eventPanels = eventListBoxes
      .map((eventListBox) => buildHomeEventsPanel(eventListBox))
      .filter(Boolean);

    mountHomeWorkspace(content, { welcomeShell, eventPanels });
  }

  function initEventsPage() {
    const content = document.getElementById("djep-content");
    const root = document.getElementById("page_eventslist");
    const eventListBoxes = Array.from(root?.querySelectorAll(".djep-eventlistbox") || []);
    if (!content || !root || !eventListBoxes.length) return;

    document.body.classList.add("djep-eventspage-ready");

    const heading = root.querySelector("h2.djep-h2")?.cloneNode(true);
    applyPageHeadingSubtitle(
      heading,
      "My Events",
      "djep-events-subtitle",
      "Review upcoming celebrations and any past events connected to your portal."
    );

    const sections = eventListBoxes.map((eventListBox) => buildEventsSection(eventListBox)).filter(Boolean);
    mountEventsWorkspace(content, { heading, sections });
  }

  function initProfilePage() {
    const content = document.getElementById("djep-content");
    const contactBox = content?.querySelector(".djep-contactdetailsbox");
    const loginBox = content?.querySelector(".djep-logindetailsbox");
    if (!content || !contactBox || !loginBox) return;

    document.body.classList.add("djep-profilepage-ready");
    content.classList.add("djep-profile-content");

    const heading = content.querySelector("h2.djep-h2");
    applyPageHeadingSubtitle(
      heading,
      "My Profile",
      "djep-profile-subtitle",
      "Manage the contact information, account access, and notification settings tied to your portal."
    );

    const panelNotes = new Map([
      ["Contact Details", "Keep your primary planning and communication details current."],
      ["Login Details", "Update your sign-in credentials for secure access to the portal."],
      ["SMS Notification Consent", "Choose whether you want text reminders and event updates."]
    ]);

    const contactColumn = document.createElement("div");
    contactColumn.className = "djep-profile-column djep-profile-column-main";

    const loginColumn = document.createElement("div");
    loginColumn.className = "djep-profile-column djep-profile-column-side";

    contactBox.classList.remove("djep-contactdetailsbox");
    contactBox.classList.add("djep-profile-panel", "djep-profile-contactbox");
    const contactTitle = contactBox.querySelector(":scope > .djep-titlebarsmall");
    if (contactTitle) {
      const contactTitleAccent = contactTitle.querySelector(".djep-titlebarsmallspan");
      contactTitle.textContent = "Contact Details";
      if (contactTitleAccent) {
        contactTitle.prepend(contactTitleAccent);
      }
    }
    loginBox.classList.remove("djep-logindetailsbox");
    loginBox.classList.add("djep-profile-panel", "djep-profile-loginbox");

    const { smsBox } = ensureProfileSmsBox(content, loginColumn);

    const contactDisplay = document.getElementById("contact_details_display_div");
    normalizeProfileGroups(contactDisplay, {
      hiddenLabels: ["Website", "Home Phone", "Work Phone", "Fax Phone"],
      collapseGroups: true
    });

    const contactEdit = document.getElementById("edit_contact_details_form_div");
    normalizeProfileGroups(contactEdit, {
      hiddenLabels: ["Website", "Home Phone", "Work Phone", "Fax Phone"],
      collapseGroups: true
    });

    const loginForm = loginBox.querySelector("form");
    normalizeProfileGroups(loginForm);
    mountProfilePanelActions(loginForm);
    normalizeProfileGroups(smsBox);
    initializeProfileSmsConsent({ content, loginBox, smsBox });

    if (smsBox instanceof HTMLElement) {
      smsBox.classList.remove("djep-profile-smsbox");
      smsBox.classList.add("djep-profile-panel", "djep-profile-smsbox");
    }

    contactColumn.append(contactBox);
    loginColumn.append(loginBox);
    if (smsBox instanceof HTMLElement) {
      loginColumn.append(smsBox);
    }

    mountProfileWorkspace(content, heading, contactColumn, loginColumn);

    [contactColumn, loginColumn].forEach((column) => {
      column
        ?.querySelectorAll('.cf, br, div[style*="height:20px"], div[style*="height:0px"]')
        .forEach((node) => node.remove());
    });

    addPanelNotes(
      Array.from(content.querySelectorAll(".djep-profile-panel")),
      "djep-profile-panel-note",
      panelNotes
    );

    content.querySelectorAll(":scope > .cf, :scope > br").forEach((node) => node.remove());
    cleanupWorkspaceColumns(
      [content],
      ':scope > div[style*="height:20px"], :scope > div[style*="height:0px"]'
    );
  }

  function initContactPage() {
    const content = document.getElementById("djep-content");
    if (!content) return;
    const formBox = content?.querySelector(".djep-contactformbox");
    const infoBox = content?.querySelector(".djep-ourcontactinfobox");
    if (!content || !formBox || !infoBox) return;

    document.body.classList.add("djep-contactpage-ready");
    content.classList.add("djep-contact-content");

    const heading = content.querySelector("h2.djep-h2");
    applyPageHeadingSubtitle(
      heading,
      "Contact",
      "djep-contact-subtitle",
      "Send a message through the portal or use the direct contact information below."
    );

    const panelNotes = new Map([
      ["Contact Form", "Use the portal form for questions, updates, or anything you need from our team."],
      ["Our Contact Information", "Call, email, or visit the website directly whenever that is easier for you."]
    ]);

    const formColumn = document.createElement("div");
    formColumn.className = "djep-contact-column djep-contact-column-main";

    const infoColumn = document.createElement("div");
    infoColumn.className = "djep-contact-column djep-contact-column-side";

    formBox.classList.remove("djep-contactformbox");
    formBox.classList.add("djep-contact-panel", "djep-contact-panel-form");
    infoBox.classList.remove("djep-ourcontactinfobox");
    infoBox.classList.add("djep-contact-panel", "djep-contact-panel-info");

    addPanelNotes([formBox, infoBox], "djep-contact-panel-note", panelNotes);

    const contactShell = formBox.querySelector("#djep-contactbox");
    if (contactShell && !contactShell.querySelector(".djep-contact-form-grid")) {
      const table = contactShell.querySelector("table");
      if (table) {
        const formGrid = buildContactFormGrid(table);
        table.replaceWith(formGrid);
      }
    }

    if (!infoBox.querySelector(".djep-contact-info-list")) {
      const table = infoBox.querySelector("table");
      const list = buildContactInfoList(table);
      if (table && list) {
        table.replaceWith(list);
      }
    }

    formColumn.append(formBox);
    infoColumn.append(infoBox);

    mountContactWorkspace(content, heading, formColumn, infoColumn);

    cleanupWorkspaceColumns(
      [formColumn, infoColumn],
      '.cf, br, div[style*="height:20px"], div[style*="height:0px"]'
    );

    content.querySelectorAll(":scope > .cf, :scope > br").forEach((node) => node.remove());
    cleanupWorkspaceColumns(
      [content],
      ':scope > div[style*="height:20px"], :scope > div[style*="height:0px"]'
    );
  }

  function initDocumentPage() {
    const content = document.getElementById("djep-content");
    const documentBox = content?.querySelector(".djep-viewdocumentbox, .djep-printdocumentbox");
    if (!content || !documentBox || documentBox.dataset.djepDocumentReady === "1") return;
    documentBox.dataset.djepDocumentReady = "1";

    const url = new URL(window.location.href);
    const action = url.searchParams.get("action") || "";
    const boxTitle = (documentBox.querySelector(".djep-titlebar")?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    const frameSrc = documentBox.querySelector("iframe")?.getAttribute("src") || "";
    const isSavedDocument =
      action === "view_saved_document" ||
      frameSrc.indexOf("saved_document") > -1 ||
      boxTitle.indexOf("contract") > -1;

    document.body.classList.add("djep-documentpage-ready");
    content.classList.add("djep-document-content");
    documentBox.classList.remove("djep-viewdocumentbox", "djep-printdocumentbox");
    documentBox.classList.add("djep-document-panel");

    if (document.title.indexOf("Client Portal - Document") === -1) {
      document.title = "Client Portal - Document";
    }

    const heading = content.querySelector("h2.djep-h2");
    if (heading) {
      heading.querySelectorAll(".djep-document-subtitle").forEach((node) => node.remove());
      const textNodes = Array.from(heading.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
      if (textNodes.length) {
        textNodes[0].textContent = "Document";
      } else {
        heading.insertBefore(document.createTextNode("Document"), heading.firstChild);
      }

      const subtitle = document.createElement("span");
      subtitle.className = "djep-document-subtitle";
      subtitle.textContent =
        isSavedDocument
          ? "Review the saved document exactly as it will be presented for this event record."
          : "Review the saved receipt exactly as it will be presented for this event's payment record.";
      heading.append(subtitle);
    }

    const backButton = content.querySelector(".djep-readviewbutton");
    if (backButton && !backButton.dataset.djepBackFallbackBound) {
      backButton.dataset.djepBackFallbackBound = "1";
      backButton.addEventListener("click", (event) => {
        if (window.history.length > 1) {
          event.preventDefault();
          window.history.back();
          return;
        }

        event.preventDefault();
        const url = new URL(window.location.href);
        const eventId = url.searchParams.get("eventid");
        window.location.href = eventId ? `eventdetails.asp?eventid=${eventId}` : "eventdetails.asp";
      });
    }

    const nextChildren = [];
    if (heading instanceof HTMLElement) nextChildren.push(heading);
    nextChildren.push(documentBox);
    if (backButton instanceof HTMLElement) nextChildren.push(backButton);
    content.replaceChildren(...nextChildren);
  }

  function initRequestChangesPage() {
    const content = document.getElementById("djep-content");
    const requestBox = content?.querySelector(".djep-requestchangesformbox");
    if (!content || !requestBox || requestBox.dataset.djepRequestChangesReady === "1") return;
    requestBox.dataset.djepRequestChangesReady = "1";

    document.body.classList.add("djep-requestchangespage-ready");
    content.classList.add("djep-requestchanges-content");

    const heading = content.querySelector("h2.djep-h2");
    normalizeRequestChangesHeading(heading);

    const changeTypeBox = requestBox.querySelector(".change_type_div");
    enhanceRequestChangesSelector(changeTypeBox);

    const backButton = requestBox.querySelector(".djep-readviewbutton") || content.querySelector(".djep-readviewbutton");
    if (backButton && requestBox.nextElementSibling !== backButton) {
      requestBox.insertAdjacentElement("afterend", backButton);
    }

    requestBox.classList.remove("djep-requestchangesformbox");
    requestBox.classList.add("djep-requestchanges-panel");

    styleRequestChangesSelects(requestBox);
    [150, 600].forEach((delay) => {
      window.setTimeout(() => styleRequestChangesSelects(requestBox), delay);
    });

    const nextChildren = [];
    if (heading) nextChildren.push(heading);
    nextChildren.push(requestBox);
    if (backButton instanceof HTMLElement) {
      backButton.classList.add("djep-requestchanges-back");
      nextChildren.push(backButton);
    }
    content.replaceChildren(...nextChildren);
  }

  function initMakePaymentPage() {
    const root = document.getElementById("page_paypal");
    if (!root || root.dataset.djepPaymentReady === "1") return;
    root.dataset.djepPaymentReady = "1";

    document.body.classList.add("djep-paymentpage-ready");
    bindPaymentAltInteractions();

    const form = root.querySelector("form");
    if (!form) return;
    form.noValidate = true;
    const paymentBox = root.querySelector(".djep-makepaymentbox");
    const isStripeDetailsStep = Boolean(root.querySelector("#payment-request-button")) || form.id === "payment-form";
    const isAmountStep = !isStripeDetailsStep;
    form.classList.add(isAmountStep ? "djep-payment-step-entry" : "djep-payment-step-details");

    if (isAmountStep) {
      bindPaymentAmountValidation(form);
    }

    const heading = root.querySelector(":scope > h2.djep-h2") || form.querySelector(":scope > h2.djep-h2") || form.querySelector("h2.djep-h2");
    mountPaymentHeadingSubtitle({ root, form, heading, isAmountStep });

    if (isStripeDetailsStep) {
      buildStripeDetailsPaymentStep({ root, form, heading });
      cleanupPaymentContentRoot(document.getElementById("djep-content"), root);
    }

    if (!paymentBox) return;

    paymentBox.querySelectorAll("title").forEach((node) => node.remove());

    const sectionTitle = paymentBox.querySelector(".djep-titlebar");
    if (sectionTitle) {
      sectionTitle.textContent = "Pay by Credit Card or Debit Card";
    }

    const paymentLogo = paymentBox.querySelector('img[alt="Pay with Debit/Credit"]');
    let brandRow = paymentBox.querySelector(".djep-payment-brandrow");
    let logoWrapper = null;
    if (paymentLogo && !brandRow) {
      logoWrapper = paymentLogo.parentElement;
      brandRow = document.createElement("div");
      brandRow.className = "djep-payment-brandrow";
      brandRow.append(paymentLogo);
      if (sectionTitle) {
        sectionTitle.insertAdjacentElement("afterend", brandRow);
      } else {
        paymentBox.prepend(brandRow);
      }
    } else if (brandRow && sectionTitle && brandRow.previousElementSibling !== sectionTitle) {
      sectionTitle.insertAdjacentElement("afterend", brandRow);
    }

    paymentBox
      .querySelectorAll(":scope > .cf, :scope > br, :scope > div[style*='height:20px'], :scope > div[style*='height:0px']")
      .forEach((node) => node.remove());

    if (sectionTitle && paymentLogo) {
      sectionTitle.classList.add("djep-payment-titlebar");
      let brandSlot = sectionTitle.querySelector(".djep-payment-brandslot");
      if (!brandSlot) {
        brandSlot = document.createElement("span");
        brandSlot.className = "djep-payment-brandslot";
        sectionTitle.append(brandSlot);
      }
      brandSlot.append(paymentLogo);
      brandRow?.remove();
      brandRow = null;
    }

    if (logoWrapper && !logoWrapper.textContent.trim() && !logoWrapper.children.length) {
      logoWrapper.remove();
    }

    const inner = paymentBox.querySelector(".djep-innercontentdiv");
    const gatewayNotes = paymentBox.querySelector("#djep-gatewaychargenotes");
    let gatewayDetails = parsePaymentGatewayDetails(gatewayNotes);
    rebuildPaymentAmountEntryInner(inner);

    if (gatewayDetails?.warningText && !paymentBox.querySelector(".djep-payment-warning-inline")) {
      const warning = document.createElement("p");
      warning.className = "djep-payment-warning djep-payment-warning-inline";
      warning.textContent = gatewayDetails.warningText;
      if (inner) {
        paymentBox.insertBefore(warning, inner);
      } else if (sectionTitle?.nextSibling) {
        paymentBox.insertBefore(warning, sectionTitle.nextSibling);
      } else {
        paymentBox.append(warning);
      }
    }

    let altBox = form.querySelector(".djep-payment-altbox");
    if (!gatewayDetails && altBox) {
      gatewayDetails = derivePaymentGatewayDetailsFromAltBox(altBox);
    }
    if ((gatewayNotes || altBox) && gatewayDetails) {
      altBox = renderPaymentGatewayAltBox({ form, paymentBox, gatewayNotes, gatewayDetails });
    }

    if (isAmountStep && paymentBox && inner) {
      buildAmountEntryPaymentStep({ form, heading, paymentBox, inner });
    }

    const poweredByWrap = Array.from(paymentBox.querySelectorAll(".col-xs-12")).find((node) =>
      node.querySelector('img[src*="powered_by_stripe"]')
    );
    if (poweredByWrap) {
      poweredByWrap.classList.add("djep-payment-poweredby");
    }

    cleanupPaymentContentRoot(document.getElementById("djep-content"), root);
  }

  function initPaymentSuccessPage() {
    const url = new URL(window.location.href);
    if (url.searchParams.get("action") !== "payment_success_message") return;
    if (document.body.dataset.djepPaymentSuccessReady === "1") return;
    document.body.dataset.djepPaymentSuccessReady = "1";
    document.body.classList.add("djep-payment-success-ready");

    const content = document.getElementById("djep-content");
    if (!content) return;

    let heading =
      content.querySelector(':scope > h1, :scope > h2.djep-h2, :scope > h2, :scope > h3') ||
      content.querySelector("h1, h2.djep-h2, h2, h3");

    const topLevelTextBlocks = Array.from(content.children).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node === heading) return false;
      if (node.id === "footer" || node.classList.contains("djep-cleared")) return false;
      return cleanText(node.textContent || "").length > 30 && cleanText(node.textContent || "").length < 240 && !node.children.length;
    });
    let subtitleSource = topLevelTextBlocks[0] || null;

    const { shell, card } = mountPaymentSuccessShell(content, heading, subtitleSource);

    if (!card) return;
    heading = applyPaymentSuccessHeading(content, shell, heading, subtitleSource, card);

    card.querySelectorAll("table").forEach((table) => {
      table.classList.add("djep-payment-success-table");
    });

    mountPaymentSuccessActions(content, shell, card);
  }

  function initPlanMyEventPage() {
    const root = document.getElementById("page_planmyevent");
    if (!root || root.dataset.djepPlanPageInit) return;
    root.dataset.djepPlanPageInit = "1";

    document.body.classList.add("djep-planpage-ready");

    const heading = root.querySelector(":scope > h2.djep-h2");
    const printHelper = root.querySelector(":scope > #djep-printhelper");
    const accessBox = root.querySelector(":scope > .djep-planneraccessbox");
    const musicBox = root.querySelector(":scope > .djep-managemusicbox");
    const planningBox = root.querySelector(":scope > .djep-planningformsbox");
    const timelineBox = root.querySelector(":scope > .djep-timelinebox");
    const existingWorkspace = root.querySelector(":scope > .djep-plan-workspace");
    const existingFlow = root.querySelector(":scope > .djep-plan-flow");

    const planningTitle = cleanText(planningBox?.querySelector("table tr td:nth-child(2)")?.textContent || "");
    const focusTitle = planningTitle.replace(/^DJ\s*-\s*/i, "");

    let eventDateText = "";
    if (heading) {
      const clone = heading.cloneNode(true);
      clone.querySelectorAll("a, button").forEach((node) => node.remove());
      eventDateText = cleanText((clone.textContent.match(/Plan My Event:\s*(.+)$/i) || [])[1] || "");
    }

    const eventDate = parseSlashDate(eventDateText);
    const longEventDate = eventDate
      ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(eventDate)
      : eventDateText;

    normalizePlanPageHeading(heading, {
      eventDate,
      eventDateText,
      focusTitle,
      longEventDate,
    });

    setPlanPageSectionTitles([
      [accessBox, "Planning Access"],
      [musicBox, "Music Tools"],
      [planningBox, "Planning Forms"],
      [timelineBox, "Timeline"],
    ]);

    accessBox?.classList.remove("djep-planneraccessbox");
    musicBox?.classList.remove("djep-managemusicbox");
    planningBox?.classList.remove("djep-planningformsbox");
    timelineBox?.classList.remove("djep-timelinebox");

    accessBox?.classList.add("djep-plan-panel", "djep-plan-panel-access");
    musicBox?.classList.add("djep-plan-panel", "djep-plan-panel-music");
    planningBox?.classList.add("djep-plan-panel", "djep-plan-panel-forms");
    timelineBox?.classList.add("djep-plan-panel", "djep-plan-panel-timeline");

    if (accessBox && !accessBox.dataset.djepPlanAccessEnhanced) {
      accessBox.dataset.djepPlanAccessEnhanced = "1";
      const lockCell = accessBox.querySelector("td");
      const lockMessage = cleanText(lockCell?.textContent || "");

      if (lockCell && lockMessage) {
        lockCell.textContent = "";
        lockCell.append(buildPlanAccessNotice(lockMessage));
      }
    }

    enhancePlanList(planningBox, "Review and update the core planning worksheet for this event.");
    enhancePlanList(timelineBox, "Build and review the flow of events for the day.");

    buildPlanMusicToolsGrid(musicBox);

    printHelper?.remove();
    root.querySelectorAll(".djep-plan-print-card").forEach((node) => node.remove());
    existingWorkspace?.remove();

    const flow = existingFlow || document.createElement("div");
    flow.className = "djep-plan-flow";
    if (!existingFlow) {
      if (accessBox) {
        accessBox.insertAdjacentElement("afterend", flow);
      } else if (heading) {
        heading.insertAdjacentElement("afterend", flow);
      } else {
        root.append(flow);
      }
    }

    [planningBox, timelineBox, musicBox].forEach((section) => {
      if (section) flow.append(section);
    });

    const nextChildren = [];
    if (heading) nextChildren.push(heading);
    if (accessBox) nextChildren.push(accessBox);
    if (flow) nextChildren.push(flow);
    root.replaceChildren(...nextChildren);

    cleanEmptyContainerNodes(
      root,
      ':scope > .cf, :scope > br, :scope > div[style*="height:0px"], :scope > div[style*="height:20px"]'
    );
  }

  function initPlanningFormsEditPage() {
    const formBox = document.querySelector(".djep-planningformseditbox");
    const form = document.getElementById("ep_form");
    if (!formBox || !form) return;
    if (!form.dataset.djepPlanningFormsInit) {
      form.dataset.djepPlanningFormsInit = "1";
    }

    document.body.classList.add("djep-planningformpage-ready");

    const pageHeading = document.querySelector("#djep-content > h2.djep-h2");
    const titlebar = form.querySelector(":scope > .djep-titlebar");
    const topSaveWrap = form.querySelector(':scope > p[align="center"]');
    const topSaveButton = topSaveWrap?.querySelector(".djep-actionbutton");
    const autosaveWrap = titlebar?.querySelector(".pull-right");
    const timerNode = titlebar?.querySelector("#autosavecountdowntimer");
    const disableLabel = titlebar?.querySelector('label[for="toggleautosave"]');
    const disableToggle = titlebar?.querySelector("#toggleautosave");

    let formTitle = "Planning Form";
    if (titlebar) {
      const titleClone = titlebar.cloneNode(true);
      titleClone.querySelectorAll(".pull-right").forEach((node) => node.remove());
      formTitle = cleanText(titleClone.textContent || "") || formTitle;
    }

    normalizePlanningFormsEditHeading(pageHeading, formTitle);

    const contentRoot = document.getElementById("djep-content");
    cleanupPlanningContentRoot(contentRoot, [pageHeading, formBox]);
    formBox.classList.remove("djep-planningformseditbox");
    formBox.classList.add("djep-planningform-panel");

    mountPlanningFormsToolbar({
      form,
      formTitle,
      topSaveButton,
      timerNode,
      disableLabel,
      disableToggle,
    });

    titlebar?.remove();
    topSaveWrap?.remove();
    autosaveWrap?.remove();

    form.querySelectorAll('table[id^="planning_form_table_"]').forEach(classifyPlanningFormsTable);

    removePlanningSongSuggestionLinks(form);
    normalizePlanningCheckboxCells(form);

    cleanEmptyContainerNodes(
      form,
      ':scope > .cf, :scope > br, :scope > div[style*="height:30px"], :scope > div[style*="height:5px"]'
    );

    const bottomSaveWrap = Array.from(form.querySelectorAll(':scope > p[align="center"]')).pop();
    const bottomSaveButton = bottomSaveWrap?.querySelector(".djep-actionbutton");
    if (bottomSaveButton) {
      bottomSaveButton.value = "Save Changes";
      bottomSaveButton.textContent = "Save Changes";
      bottomSaveButton.classList.add("djep-planningform-save-bottom");
      bottomSaveWrap.classList.add("djep-planningform-save-footer");
    }

    const nextChildren = [];
    if (pageHeading instanceof HTMLElement) nextChildren.push(pageHeading);
    nextChildren.push(formBox);
    contentRoot?.replaceChildren(...nextChildren);
  }

  function initPlanningFormsLandingPage() {
    if (!isMobileViewport()) return;

    const content = document.getElementById("djep-content");
    const formBox = document.querySelector(".djep-planningformseditbox");
    const pageHeading = document.querySelector("#djep-content > h2.djep-h2");
    if (!content || formBox) return;

    const eventId = getCurrentEventId();
    const planHref = normalizeShellHref(
      pageHeading?.querySelector(".djep-planeventbutton")?.getAttribute("href") ||
        (eventId ? `/clients/planmyevent.asp?eventid=${encodeURIComponent(eventId)}` : "/clients/planmyevent.asp")
    );

    document.body.classList.add("djep-planningformslanding-ready");
    upsertRuntimeStyle(
      "djep-planningforms-landing-mobile-runtime",
      `
  @media (max-width: 767px) {
  body.djep-planningformslanding-ready .djep-planningformslanding-heading {
    display: grid !important;
    gap: 14px !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-title {
    color: #101729 !important;
    font-size: 20px !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-subtitle {
    color: #667085 !important;
    font-size: 15px !important;
    font-weight: 500 !important;
    line-height: 1.7 !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-shell {
    display: grid !important;
    gap: 18px !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-hero,
  body.djep-planningformslanding-ready .djep-planningformslanding-card,
  body.djep-planningformslanding-ready .djep-planningformslanding-empty {
    display: grid !important;
    gap: 12px !important;
    padding: 22px !important;
    border: 1px solid rgba(216, 223, 235, 0.96) !important;
    border-radius: 24px !important;
    background: rgba(255, 255, 255, 0.98) !important;
    box-shadow: 0 14px 28px rgba(17, 26, 46, 0.05) !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-eyebrow,
  body.djep-planningformslanding-ready .djep-planningformslanding-listlabel {
    color: #667085 !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    letter-spacing: 0.1em !important;
    text-transform: uppercase !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-herotitle {
    color: #101729 !important;
    font-size: 24px !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-copy,
  body.djep-planningformslanding-ready .djep-planningformslanding-emptycopy {
    color: #667085 !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    line-height: 1.7 !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-count {
    display: inline-flex !important;
    align-items: center !important;
    width: fit-content !important;
    min-height: 34px !important;
    padding: 0 14px !important;
    border-radius: 999px !important;
    background: #f8fafc !important;
    color: #344054 !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    letter-spacing: 0.05em !important;
    text-transform: uppercase !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-list {
    display: grid !important;
    gap: 14px !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-cardtitle {
    color: #101729 !important;
    font-size: 18px !important;
    font-weight: 800 !important;
    line-height: 1.25 !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-cardnote {
    color: #667085 !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    line-height: 1.7 !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-actions {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-action {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    min-height: 46px !important;
    padding: 0 14px !important;
    border-radius: 16px !important;
    text-align: center !important;
  }

  body.djep-planningformslanding-ready .djep-planningformslanding-action--secondary {
    border: 1px solid rgba(216, 223, 235, 0.96) !important;
    background: #ffffff !important;
    color: #344054 !important;
    box-shadow: 0 6px 14px rgba(17, 26, 46, 0.05) !important;
  }
}
      `.trim()
    );

    normalizePlanningFormsLandingHeading(pageHeading);

    cleanupPlanningContentRoot(content, [pageHeading]);

    const shell = createPlanningFormsLandingShell(content);

    const countNode = shell.querySelector(".djep-planningformslanding-count");
    const list = shell.querySelector(".djep-planningformslanding-list");
    if (!(list instanceof HTMLElement)) return;

    const cacheKey = eventId ? `djepPlanningFormsLanding:${eventId}` : "";
    if (cacheKey) {
      try {
        const cached = window.sessionStorage?.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length) {
            renderPlanningFormsLandingEntries(list, countNode, planHref, parsed);
          }
        }
      } catch (error) {}
    }

    if (shell.dataset.djepPlanningFormsLoadedFor === eventId) return;
    shell.dataset.djepPlanningFormsLoadedFor = eventId || "none";

    if (!eventId) {
      renderPlanningFormsLandingEmptyState(
        list,
        countNode,
        planHref,
        "This page needs an event ID before it can load the available planning forms."
      );
      return;
    }

    const planUrl = `/clients/planmyevent.asp?eventid=${encodeURIComponent(eventId)}`;
    fetch(planUrl, { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((markup) => {
        const entries = parsePlanningFormsEntriesFromMarkup(markup);

        if (cacheKey && entries.length) {
          try {
            window.sessionStorage?.setItem(cacheKey, JSON.stringify(entries));
          } catch (error) {}
        }

        renderPlanningFormsLandingEntries(list, countNode, planHref, entries);
      })
      .catch(() => {
        renderPlanningFormsLandingEntries(list, countNode, planHref, buildPlanningFormsFallbackEntries(eventId));
      });
  }

  function ensureTimelineTopSaveButton(form, titlebar, timelineSaveButton) {
    if (!form || !titlebar || !timelineSaveButton) return null;

    const rightControls = titlebar.querySelector(".pull-right");
    let topSaveButton = titlebar.querySelector(".djep-timeline-save-top");

    if (!topSaveButton) {
      topSaveButton = document.createElement("button");
      topSaveButton.type = "button";
      topSaveButton.className = "djep-actionbutton djep-timeline-save-top";
      topSaveButton.textContent = "Save Changes";
    }

    if (bindDatasetOnce(topSaveButton, "djepTimelineBound")) {
      topSaveButton.addEventListener("click", (event) => {
        event.preventDefault();

        if (typeof timelineSaveButton.click === "function") {
          timelineSaveButton.click();
          return;
        }

        if (typeof form.requestSubmit === "function") {
          form.requestSubmit(timelineSaveButton);
          return;
        }

        form.submit();
      });
    }

    if (rightControls) {
      if (topSaveButton.parentElement !== rightControls) {
        rightControls.insertBefore(topSaveButton, rightControls.firstChild);
      }
    } else if (topSaveButton.parentElement !== titlebar) {
      titlebar.append(topSaveButton);
    }

    return topSaveButton;
  }

  function normalizeTimelineTitlebar(titlebar, timelineHeadline, instructionsText) {
    if (!titlebar) return;

    const rightControls =
      titlebar.querySelector(".pull-right") ||
      (() => {
        const controls = document.createElement("span");
        controls.className = "pull-right";
        titlebar.append(controls);
        return controls;
      })();
    const topSaveButton = rightControls.querySelector(".djep-timeline-save-top");

    const titleLines = (timelineHeadline?.value || "")
      .split(/\r?\n/)
      .map((line) => cleanText(line))
      .filter(Boolean);

    const toolbarTitle = titleLines[0] || "Event Timeline";
    const toolbarNote =
      instructionsText || "Click on the activity below to add to the timeline. You can also drag and drop timeline items to empty rows.";

    let intro = titlebar.querySelector(".djep-timeline-toolbar-intro");
    let label = intro?.querySelector(".djep-timeline-toolbar-label");
    let title = intro?.querySelector(".djep-timeline-toolbar-title");
    let note = intro?.querySelector(".djep-timeline-toolbar-note");

    if (!intro) {
      intro = document.createElement("div");
      intro.className = "djep-timeline-toolbar-intro";

      label = document.createElement("div");
      label.className = "djep-timeline-toolbar-label";
      label.textContent = "Timeline Overview";

      title = document.createElement("div");
      title.className = "djep-timeline-toolbar-title";

      note = document.createElement("p");
      note.className = "djep-timeline-toolbar-note";

      intro.append(label, title, note);
    }

    title.textContent = toolbarTitle;
    note.textContent = toolbarNote;

    rightControls.classList.add("djep-timeline-toolbar-meta");
    rightControls.querySelectorAll("br").forEach((node) => node.remove());

    const timerNode = rightControls.querySelector("#autosavecountdowntimer");
    const disableLabel = rightControls.querySelector('label[for="toggleautosave"]');
    const disableToggle = rightControls.querySelector("#toggleautosave");
    const disableLabelText = cleanText(disableLabel?.textContent || "Disable");
    let metaCard = rightControls.querySelector(".djep-timeline-meta-card");

    if (!metaCard) {
      metaCard = document.createElement("div");
      metaCard.className = "djep-timeline-meta-card";
    }

    if (!metaCard.querySelector(".djep-timeline-meta-label")) {
      const metaLabel = document.createElement("div");
      metaLabel.className = "djep-timeline-meta-label";
      metaLabel.textContent = "Auto Save";
      metaCard.prepend(metaLabel);
    }

    if (timerNode) {
      timerNode.classList.add("djep-timeline-timer");
      metaCard.append(timerNode);
    }

    if (disableToggle && disableLabel && !metaCard.querySelector(".djep-timeline-toggle")) {
      const toggle = document.createElement("label");
      toggle.className = "djep-timeline-toggle";
      toggle.setAttribute("for", "toggleautosave");

      const toggleText = document.createElement("span");
      toggleText.className = "djep-timeline-toggle-text";
      toggleText.textContent = disableLabelText || "Disable";

      toggle.append(disableToggle, toggleText);
      metaCard.append(toggle);
    }

    rightControls.innerHTML = "";
    if (topSaveButton) {
      rightControls.append(topSaveButton);
    }
    rightControls.append(metaCard);

    titlebar.textContent = "";
    titlebar.append(intro, rightControls);
  }

  function normalizeTimelinePageHeading(pageHeading) {
    if (!pageHeading) return;

    pageHeading.classList.add("djep-timeline-heading");
    const optionsButton = pageHeading.querySelector(".djep-planeventbutton");
    if (optionsButton && !optionsButton.dataset.djepLabelNormalized) {
      optionsButton.dataset.djepLabelNormalized = "1";
      optionsButton.textContent = "Planning Options";
    }

    if (!pageHeading.dataset.djepTimelineHeadingInit) {
      pageHeading.dataset.djepTimelineHeadingInit = "1";

      Array.from(pageHeading.childNodes).forEach((node) => {
        if (node !== optionsButton) node.remove();
      });

      const title = document.createElement("span");
      title.className = "djep-timeline-page-title";
      title.textContent = "Timeline";

      if (optionsButton) {
        pageHeading.insertBefore(title, optionsButton);
      } else {
        pageHeading.append(title);
      }

      const subtitle = document.createElement("div");
      subtitle.className = "djep-timeline-page-subtitle";
      pageHeading.append(subtitle);
    }

    const subtitle = pageHeading.querySelector(".djep-timeline-page-subtitle");
    if (subtitle) {
      subtitle.textContent = "Build and fine-tune the flow of events for the day.";
    }
  }

  function initializeTimelineStructure({
    form,
    editor,
    contentRoot,
    pageHeading,
    titlebar,
    headerRow,
    mainRow,
    footerRow,
    timelineHeadline,
    timelineSaveButton,
  }) {
    if (!form || form.dataset.djepTimelineStructureInit) return;
    form.dataset.djepTimelineStructureInit = "1";

    if (contentRoot) {
      Array.from(contentRoot.children).forEach((child) => {
        if (child === pageHeading || child === form) return;
        if (child.tagName === "SCRIPT") return;
        if (child.classList.contains("cf") || child.tagName === "BR") {
          child.remove();
          return;
        }

        if (
          child.tagName === "DIV" &&
          !child.className &&
          !cleanText(child.textContent || "") &&
          child.children.length === 0
        ) {
          child.remove();
        }
      });
    }

    titlebar?.classList.add("djep-timeline-native-titlebar");
    headerRow?.classList.add("djep-timeline-native-header", "djep-timeline-header-row-hidden");
    mainRow?.classList.add("djep-timeline-native-main");
    footerRow?.classList.add("djep-timeline-native-footer");

    if (timelineHeadline && !timelineHeadline.dataset.djepTimelinePreserveValue) {
      timelineHeadline.dataset.djepTimelinePreserveValue = "1";
      timelineHeadline.setAttribute("aria-hidden", "true");
      timelineHeadline.tabIndex = -1;
    }

    const activityTable = mainRow?.querySelector(".djep-activitytable");
    if (activityTable) activityTable.classList.add("djep-timeline-activity-table");

    const timelineTable = mainRow?.querySelector(".djep-timelinetable");
    if (timelineTable) timelineTable.classList.add("djep-timeline-editor-table");

    const cancelButton = footerRow?.querySelector('input[type="button"]');
    if (cancelButton && !cancelButton.dataset.djepTimelineRelabeled) {
      cancelButton.dataset.djepTimelineRelabeled = "1";
      cancelButton.value = "Back to Planning";
      cancelButton.classList.add("djep-timeline-cancel-button");
    }

    if (timelineSaveButton && !timelineSaveButton.dataset.djepTimelineRelabeled) {
      timelineSaveButton.dataset.djepTimelineRelabeled = "1";
      if (timelineSaveButton.tagName === "INPUT") {
        timelineSaveButton.value = "Save Changes";
      } else {
        timelineSaveButton.textContent = "Save Changes";
      }
      timelineSaveButton.classList.add("djep-timeline-save-bottom");
    }

    form
      .querySelectorAll(':scope > .cf, :scope > br, :scope > div[style*="height:30px"], :scope > div[style*="height:5px"]')
      .forEach((node) => node.remove());

    if (isLocalPreviewEnvironment()) {
      const autosaveToggle = editor?.querySelector("#toggleautosave");
      if (autosaveToggle && !autosaveToggle.checked) {
        autosaveToggle.checked = true;
        autosaveToggle.dispatchEvent(new Event("change", { bubbles: true }));
      }
      document.body.classList.add("djep-local-static");
    }
  }

  function bindTimelineDropTargets(editor) {
    if (!editor || editor.dataset.djepTimelineDropPatched || !window.jQuery?.fn?.droppable) return;
    editor.dataset.djepTimelineDropPatched = "1";

    window.jQuery('[id^="timeline_row_"]').each(function bindTimelineDrop() {
      const $row = window.jQuery(this);
      try {
        $row.droppable("option", "drop", patchedHandleDropEventForTimeline);
      } catch (error) {
        $row.droppable({ drop: patchedHandleDropEventForTimeline });
      }
    });
  }

  function normalizeTimelineNativeRowControls(editor) {
    if (!editor) return;

    editor.querySelectorAll('tr[id^="timeline_row_"]').forEach((row) => {
      const controlCell = row.querySelector("td:last-child");
      const controlWrap = controlCell?.querySelector("div");
      if (!controlCell || !controlWrap) return;

      controlCell.classList.add("djep-timeline-control-cell");
      controlWrap.classList.add("djep-timeline-native-controls");
      controlCell.querySelectorAll(".djep-timeline-delete-overlay").forEach((overlay) => overlay.remove());
    });
  }

  function normalizeMusicPageHeading(heading) {
    if (!heading) return;
    if (heading.dataset.djepMusicHeadingInit === "1" && heading.querySelector(".djep-music-title")) return;

    heading.dataset.djepMusicHeadingInit = "1";
    heading.classList.add("djep-music-heading");

    const planningButton = heading.querySelector("a.djep-planeventbutton, a.djep-readviewbutton");
    const rawTitleNode = Array.from(heading.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && cleanText(node.textContent || ""));
    const rawTitle = cleanText(rawTitleNode?.textContent || heading.textContent || "Select Your Music");

    heading.textContent = "";

    const title = document.createElement("span");
    title.className = "djep-music-title";
    title.textContent = rawTitle || "Select Your Music";

    const subtitle = document.createElement("div");
    subtitle.className = "djep-music-subtitle";
    subtitle.textContent = "Browse the library, add your own tracks, and organize request lists for the event.";

    if (planningButton) {
      planningButton.className = "djep-planeventbutton djep-changebutton djep-music-header-button";
      planningButton.textContent = "Planning Options";
      heading.append(title, planningButton, subtitle);
    } else {
      heading.append(title, subtitle);
    }
  }

  function bindMusicPlanningNavButton(planningNavButton) {
    if (!(planningNavButton instanceof HTMLAnchorElement)) return;
    if (!bindDatasetOnce(planningNavButton, "djepSafeNavBound")) return;

    planningNavButton.addEventListener("click", (event) => {
      if (!isMobileViewport()) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const targetHref = normalizeShellHref(planningNavButton.getAttribute("href") || "");
      if (!targetHref || /^(javascript:|mailto:|tel:)/i.test(targetHref)) return;

      event.preventDefault();
      clearLegacyLeaveGuards();
      document.body.classList.remove("djep-force-mobile-shell-open", "djep-mobile-shell-open");
      window.location.assign(targetHref);
    });
  }

  function bindMusicRequestMetaObserver(requestsCell, queueMusicRequestMetaSync) {
    if (!(requestsCell instanceof HTMLElement)) return;
    if (!bindDatasetOnce(requestsCell, "djepMusicMetaObserverBound")) return;

    const requestMetaObserver = new MutationObserver((mutations) => {
      const hasStructuralChange = mutations.some((mutation) => {
        return mutation.type === "childList" && (mutation.addedNodes.length || mutation.removedNodes.length);
      });
      if (!hasStructuralChange) return;
      queueMusicRequestMetaSync();
    });
    requestMetaObserver.observe(requestsCell, { childList: true, subtree: true });
  }

  function scheduleMusicRequestMetaRefresh(queueMusicRequestMetaSync) {
    if (typeof queueMusicRequestMetaSync !== "function") return;
    queueMusicRequestMetaSync();
    runAfterDelays(queueMusicRequestMetaSync, [120, 500]);
  }

  function bindMusicMaintenanceObserver({
    musicBox,
    decorateMusicRows,
    normalizeMusicRequestHeaders,
    normalizeMusicPlaylistRows,
    refreshMusicEmptyStates,
    refreshMusicRequestViews,
    normalizeMusicMobileLayout,
    refreshMusicRequestMobilePresentation,
    requestsCell,
  }) {
    if (!(musicBox instanceof HTMLElement)) return;
    if (!bindDatasetOnce(musicBox, "djepMusicObserverBound")) return;

    let musicMaintenanceQueued = false;
    const queueMusicMaintenance = () => {
      if (musicMaintenanceQueued) return;
      musicMaintenanceQueued = true;
      window.requestAnimationFrame(() => {
        musicMaintenanceQueued = false;
        decorateMusicRows(musicBox);
        normalizeMusicRequestHeaders();
        normalizeMusicPlaylistRows(requestsCell);
        refreshMusicEmptyStates();
        refreshMusicRequestViews();
        normalizeMusicMobileLayout();
        refreshMusicRequestMobilePresentation();
      });
    };

    const observer = new MutationObserver((mutations) => {
      let sawElementMutation = false;
      mutations.forEach((mutation) => {
        if (mutation.removedNodes && mutation.removedNodes.length) {
          sawElementMutation = true;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          sawElementMutation = true;
          decorateMusicRows(node);
        });
      });
      if (sawElementMutation) {
        queueMusicMaintenance();
      }
    });
    observer.observe(musicBox, { childList: true, subtree: true });
  }

  function normalizeGuestRequestsHeading(heading, backButton) {
    if (!heading || heading.dataset.djepGuestRequestsHeadingInit) return;
    heading.dataset.djepGuestRequestsHeadingInit = "1";

    Array.from(heading.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !cleanText(node.textContent || "")) {
        node.remove();
      }
    });

    const rawTitle = cleanText(heading.childNodes[0]?.textContent || heading.textContent || "Guest Requests");
    heading.textContent = "";

    const title = document.createElement("span");
    title.className = "djep-guestrequests-title";
    title.textContent = rawTitle || "Guest Requests";

    const subtitle = document.createElement("div");
    subtitle.className = "djep-guestrequests-subtitle";
    subtitle.textContent = "Share the request link with your guests, manage access, and review submissions.";

    if (backButton) {
      backButton.textContent = "Back to Planning";
      backButton.className = "djep-planeventbutton djep-changebutton djep-guestrequests-header-button";
      heading.append(title, backButton, subtitle);
      return;
    }

    heading.append(title, subtitle);
  }

  function buildGuestRequestsInfoRow(label, value, actionNode, extraClass) {
    const row = document.createElement("div");
    row.className = "djep-guestrequests-info-row" + (extraClass ? " " + extraClass : "");

    const copy = document.createElement("div");
    copy.className = "djep-guestrequests-info-copy";

    const labelNode = document.createElement("div");
    labelNode.className = "djep-guestrequests-info-label";
    labelNode.textContent = label;

    const valueNode = document.createElement("div");
    valueNode.className = "djep-guestrequests-info-value";
    valueNode.textContent = value || "Not available";

    copy.append(labelNode, valueNode);
    row.append(copy);

    if (actionNode) {
      actionNode.classList.add("djep-guestrequests-utility-button");
      actionNode.textContent = "Copy";
      actionNode.removeAttribute("onclick");
      actionNode.setAttribute("role", "button");
      actionNode.setAttribute("tabindex", "0");
      actionNode.addEventListener("click", (event) => {
        event.preventDefault();
        copyTextValue(value);
      });
      actionNode.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          copyTextValue(value);
        }
      });
      row.append(actionNode);
    }

    return row;
  }

  function buildGuestRequestItem(row) {
    const cells = Array.from(row.querySelectorAll("td"));
    const texts = cells.map((cell) => cleanText(cell.textContent || "")).filter(Boolean);
    if (!texts.length) return null;

    const item = document.createElement("article");
    item.className = "djep-guestrequests-item";

    const main = document.createElement("div");
    main.className = "djep-guestrequests-item-main";

    const title = document.createElement("div");
    title.className = "djep-guestrequests-item-title";
    title.textContent = texts[0];
    main.append(title);

    if (texts[1]) {
      const meta = document.createElement("div");
      meta.className = "djep-guestrequests-item-meta";
      meta.textContent = texts[1];
      main.append(meta);
    }

    if (texts[2]) {
      const note = document.createElement("div");
      note.className = "djep-guestrequests-item-note";
      note.textContent = texts.slice(2).join(" | ");
      main.append(note);
    }

    item.append(main);
    return item;
  }

  function normalizeSongRequestsHeading(heading, backButton) {
    if (!heading || heading.dataset.djepSongRequestsHeadingInit) return;
    heading.dataset.djepSongRequestsHeadingInit = "1";
    heading.classList.add("djep-songrequests-heading");

    Array.from(heading.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !cleanText(node.textContent || "")) {
        node.remove();
      }
    });

    const rawTitle = cleanText(heading.textContent || "Song Requests");
    heading.textContent = "";

    const title = document.createElement("span");
    title.className = "djep-songrequests-title";
    title.textContent = rawTitle || "Song Requests";

    const subtitle = document.createElement("div");
    subtitle.className = "djep-songrequests-subtitle";
    subtitle.textContent = "Review, edit, and manage the requested songs tied to this event.";

    if (backButton) {
      backButton.textContent = "Back to Planning";
      backButton.className = "djep-planeventbutton djep-changebutton djep-songrequests-header-button";
      heading.append(title, backButton, subtitle);
      return;
    }

    heading.append(title, subtitle);
  }

  function buildSongRequestAction(link, label, className, titleText) {
    if (!link) return null;
    link.classList.add("djep-songrequest-action", className);
    link.dataset.label = label;
    link.setAttribute("title", titleText);
    link.setAttribute("aria-label", titleText);
    return link;
  }

  function buildSongRequestItem(row) {
    row.removeAttribute("onmouseover");
    row.removeAttribute("onmouseout");
    row.classList.remove("djep-even", "djep-odd", "djep-tablehover", "djep-tablehover1", "djep-tablehover2");

    const cells = Array.from(row.querySelectorAll("td"));
    const actionLinks = Array.from(row.querySelectorAll("a"));
    const deleteLink = actionLinks[0] ? actionLinks[0].cloneNode(true) : null;
    const editLink = actionLinks[1] ? actionLinks[1].cloneNode(true) : null;
    const artist = cleanText(cells[5]?.textContent || "");
    const songTitle = cleanText(cells[6]?.textContent || "");
    const comments = cleanText(cells[7]?.textContent || "");

    const item = document.createElement("article");
    item.className = "djep-songrequest-item";

    const copy = document.createElement("div");
    copy.className = "djep-songrequest-item-copy";

    const song = document.createElement("div");
    song.className = "djep-songrequest-item-title";
    song.textContent = songTitle || "Untitled Song";

    const artistName = document.createElement("div");
    artistName.className = "djep-songrequest-item-artist";
    artistName.textContent = artist || "Unknown Artist";

    copy.append(song, artistName);

    if (comments) {
      const note = document.createElement("p");
      note.className = "djep-songrequest-item-note";
      note.textContent = comments;
      copy.append(note);
    }

    item.append(copy);

    const actions = document.createElement("div");
    actions.className = "djep-songrequest-actions";

    const normalizedEditLink = buildSongRequestAction(editLink, "Edit", "djep-songrequest-action-edit", "Edit request");
    if (normalizedEditLink) {
      actions.append(normalizedEditLink);
    }

    const normalizedDeleteLink = buildSongRequestAction(deleteLink, "Delete", "djep-songrequest-action-delete", "Delete request");
    if (normalizedDeleteLink) {
      actions.append(normalizedDeleteLink);
    }

    item.append(actions);
    return item;
  }

  function buildSongRequestCard(box) {
    const title = cleanText(box.querySelector(".djep-titlebar")?.textContent || "Song Request Group");
    const totalsText = cleanText(box.querySelector(".djep-songrequesttotals")?.textContent || "");
    const rows = Array.from(box.querySelectorAll("table tr"));

    const card = document.createElement("section");
    card.className = "djep-songrequest-card";

    const cardHeader = document.createElement("div");
    cardHeader.className = "djep-songrequest-card-header";

    const cardTitle = document.createElement("div");
    cardTitle.className = "djep-songrequest-card-title";
    cardTitle.textContent = title;
    cardHeader.append(cardTitle);

    if (totalsText) {
      const totalCountMatch = totalsText.match(/Total Added:\s*([0-9]+)/i);
      const timeMatch = totalsText.match(/Estimated Playing Time:\s*(.+)$/i);
      const meta = document.createElement("div");
      meta.className = "djep-songrequest-card-meta";

      if (totalCountMatch) {
        const added = document.createElement("span");
        added.className = "djep-songrequest-meta-item";
        added.innerHTML = '<span class="djep-songrequest-meta-label">Added</span><span class="djep-songrequest-meta-value">' + totalCountMatch[1] + "</span>";
        meta.append(added);
      }

      if (timeMatch) {
        const runtime = document.createElement("span");
        runtime.className = "djep-songrequest-meta-item";
        runtime.innerHTML = '<span class="djep-songrequest-meta-label">Est. Time</span><span class="djep-songrequest-meta-value">' + timeMatch[1] + "</span>";
        meta.append(runtime);
      }

      if (meta.children.length) {
        cardHeader.append(meta);
      }
    }

    card.append(cardHeader);

    if (!rows.length) {
      card.classList.add("djep-songrequest-card-empty");
      const empty = document.createElement("div");
      empty.className = "djep-songrequest-empty";
      empty.textContent = "No songs added yet.";
      card.append(empty);
      return { card, hasSongs: false };
    }

    const list = document.createElement("div");
    list.className = "djep-songrequest-list";
    rows.forEach((row) => list.append(buildSongRequestItem(row)));
    card.append(list);

    return { card, hasSongs: true };
  }

  function getSpotifyStableState(spotifyPanel) {
    if (!(spotifyPanel instanceof HTMLElement)) return { token: 0, cachedMarkup: "", request: null };
    return (
      spotifyPanel.__djepSpotifyStableState ||
      (spotifyPanel.__djepSpotifyStableState = {
        token: 0,
        cachedMarkup: "",
        request: null,
      })
    );
  }

  function getSpotifyMusicState(spotifyPanel) {
    if (!(spotifyPanel instanceof HTMLElement)) return { libraryToken: 0, trackToken: 0 };
    return (
      spotifyPanel.__djepSpotifyMusicState ||
      (spotifyPanel.__djepSpotifyMusicState = {
        libraryToken: 0,
        trackToken: 0,
      })
    );
  }

  function getSpotifyEventId() {
    return (
      document.forms.ep_form?.elements?.eventid?.value ||
      document.getElementById("upcomingeventid")?.textContent ||
      ""
    );
  }

  function getSpotifyPlaylistsUrl(eventId) {
    return `/clients/spotify.php?action=load_playlists&eventid=${encodeURIComponent(eventId)}`;
  }

  function getSpotifyConnectUrl(eventId) {
    return `/clients/spotify.asp?eventid=${encodeURIComponent(eventId)}`;
  }

  function getSpotifyPlaylistsCacheKey(eventId) {
    return `djepSpotifyPlaylistsMarkup:${eventId}`;
  }

  function readSpotifyCachedMarkup(state, eventId, getCacheKey) {
    if (String(state?.cachedMarkup || "").trim()) {
      return state.cachedMarkup;
    }
    try {
      return window.sessionStorage?.getItem(getCacheKey(eventId)) || "";
    } catch (error) {
      return "";
    }
  }

  function writeSpotifyCachedMarkup(state, eventId, markup, getCacheKey) {
    const normalizedMarkup = String(markup || "");
    if (!normalizedMarkup.trim()) return;
    state.cachedMarkup = normalizedMarkup;
    try {
      window.sessionStorage?.setItem(getCacheKey(eventId), normalizedMarkup);
    } catch (error) {}
  }

  function decorateSpotifyConnectLinks(root) {
    if (!(root instanceof Element)) return;
    root.querySelectorAll("a[href*='spotify.asp?eventid']").forEach((link) => {
      link.classList.add("djep-spotify-connect-link");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
      if (link.dataset.djepSpotifyConnectBound === "1") return;
      link.dataset.djepSpotifyConnectBound = "1";
      link.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });
  }

  function renderSpotifyMarkup(spotifyPlaylistsPanel, markup) {
    if (!(spotifyPlaylistsPanel instanceof HTMLElement) || !window.jQuery) return;
    window.jQuery(spotifyPlaylistsPanel).html(markup).show();
    decorateSpotifyConnectLinks(spotifyPlaylistsPanel);
  }

  function renderSpotifyConnectState(spotifyPlaylistsPanel, getConnectUrl, eventId, message = "") {
    const safeMessage = String(message || "").trim();
    renderSpotifyMarkup(
      spotifyPlaylistsPanel,
      `<div class="djep-music-empty-panel">${safeMessage ? `<p align="center" class="djep-music-empty-note">${safeMessage}</p>` : ""}<p align="center"><a class="djep-spotify-connect-link" href="${getConnectUrl(eventId)}"><img src="images/connect_spotify.png" style="max-width:200px;" alt="Connect Spotify"></a></p></div>`
    );
  }

  function showSpotifyTabPanel(spotifyTabItem, spotifyPanel, spotifyTabAnchor) {
    const tabsNav = spotifyTabItem?.parentElement;
    tabsNav?.querySelectorAll(":scope > li").forEach((item) => {
      item.classList.remove("ui-tabs-active", "ui-state-active");
      const anchor = item.querySelector("a");
      anchor?.setAttribute("aria-selected", item === spotifyTabItem ? "true" : "false");
    });
    spotifyTabItem?.classList.add("ui-tabs-active", "ui-state-active");
    document.querySelectorAll(".ui-tabs-panel").forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const isSpotifyPanel = panel.id === "tabs-7";
      panel.style.display = isSpotifyPanel ? "" : "none";
      panel.setAttribute("aria-hidden", isSpotifyPanel ? "false" : "true");
      panel.setAttribute("aria-expanded", isSpotifyPanel ? "true" : "false");
    });
    spotifyTabAnchor?.setAttribute("aria-selected", "true");
    if (spotifyPanel instanceof HTMLElement) {
      spotifyPanel.style.display = "";
    }
  }

  function hideSpotifyTabPanel(spotifyTabItem, spotifyPanel, spotifyTabAnchor, spotifyTracksPanel) {
    spotifyTabItem?.classList.remove("ui-tabs-active", "ui-state-active");
    spotifyTabAnchor?.setAttribute("aria-selected", "false");
    if (spotifyPanel instanceof HTMLElement) {
      spotifyPanel.style.display = "none";
      spotifyPanel.setAttribute("aria-hidden", "true");
      spotifyPanel.setAttribute("aria-expanded", "false");
    }
    if (spotifyTracksPanel instanceof HTMLElement) {
      spotifyTracksPanel.style.display = "none";
    }
  }

  function applySpotifyScrollablePanelStyles(panel) {
    if (!(panel instanceof HTMLElement)) return;
    panel.style.overflowY = "auto";
    panel.style.overflowX = "hidden";
    panel.style.webkitOverflowScrolling = "touch";
    panel.style.overscrollBehavior = "contain";
    panel.style.scrollbarGutter = "stable";
  }

  function resetSpotifyTracksPanel(spotifyTracksPanel) {
    if (!(spotifyTracksPanel instanceof HTMLElement)) return;
    spotifyTracksPanel.innerHTML = "";
    spotifyTracksPanel.style.display = "none";
  }

  function resetSpotifyAddPlaylistButtons(spotifyTracksPanel) {
    if (!(spotifyTracksPanel instanceof HTMLElement)) return;
    spotifyTracksPanel.querySelectorAll(".djep-addplaylistbutton").forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.style.display = "";
      button.removeAttribute("aria-busy");
    });
    spotifyTracksPanel.querySelectorAll(".djep-addingplaylistbutton").forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.style.display = "none";
    });
  }

  function renderSpotifyCachedOrConnectState({
    state,
    eventId,
    getCacheKey,
    spotifyPlaylistsPanel,
    getConnectUrl,
    message,
  }) {
    const cachedMarkup = readSpotifyCachedMarkup(state, eventId, getCacheKey);
    if (cachedMarkup.trim()) {
      renderSpotifyMarkup(spotifyPlaylistsPanel, cachedMarkup);
      return true;
    }

    renderSpotifyConnectState(spotifyPlaylistsPanel, getConnectUrl, eventId, message);
    return false;
  }

  function loadSpotifyPlaylistsIntoPanel({
    spotifyPanel,
    spotifyPlaylistsPanel,
    spotifyTracksPanel,
    onComplete,
    emptyMessage = "Connect Spotify to browse playlists and albums.",
  }) {
    const eventId = getSpotifyEventId();
    if (!eventId || !window.jQuery || !(spotifyPlaylistsPanel instanceof HTMLElement)) {
      return false;
    }

    const stableState = getSpotifyStableState(spotifyPanel);
    const musicState = getSpotifyMusicState(spotifyPanel);
    const requestToken = ++musicState.libraryToken;

    if (stableState.request && typeof stableState.request.abort === "function") {
      try {
        stableState.request.abort();
      } catch (error) {}
    }

    resetSpotifyTracksPanel(spotifyTracksPanel);
    applySpotifyScrollablePanelStyles(spotifyTracksPanel);
    spotifyPlaylistsPanel.style.display = "";
    applySpotifyScrollablePanelStyles(spotifyPlaylistsPanel);

    const handleFallback = () => {
      const renderedFromCache = renderSpotifyCachedOrConnectState({
        state: stableState,
        eventId,
        getCacheKey: getSpotifyPlaylistsCacheKey,
        spotifyPlaylistsPanel,
        getConnectUrl: getSpotifyConnectUrl,
        message: emptyMessage,
      });
      if (typeof onComplete === "function") onComplete({ eventId, renderedFromCache });
    };

    stableState.request = window.jQuery
      .get(getSpotifyPlaylistsUrl(eventId))
      .done((data) => {
        if (requestToken !== musicState.libraryToken) return;
        const markup = String(data || "");
        if (!markup.trim()) {
          handleFallback();
          return;
        }

        writeSpotifyCachedMarkup(stableState, eventId, markup, getSpotifyPlaylistsCacheKey);
        renderSpotifyMarkup(spotifyPlaylistsPanel, markup);
        if (typeof onComplete === "function") onComplete({ eventId, renderedFromCache: false });
      })
      .fail(() => {
        if (requestToken !== musicState.libraryToken) return;
        handleFallback();
      });

    return true;
  }

  function buildSpotifyTracksPanelMarkup({ numberOfTracks, playlistName, playlistId, eventId, dataHTML }) {
    if (numberOfTracks > 0) {
      return (
        `<div style="margin:10px 0px;"><div style="text-align:center;margin:5px;"><img src="../images/spotify_playlist_long.png"><h3 class="djep-h3" style="margin-top:3px;">${playlistName}</h3><br><div class="djep-actionbutton pointer djep-addplaylistbutton" onclick="addWholePlaylistOrAlbum('${playlistId}', 'playlist', ${eventId}, '${String(playlistName).replace(/'/g, "\\'")}');">Add Playlist</div><div class="djep-actionbutton djep-addingplaylistbutton" style="display:none;">Adding Playlist...</div>&nbsp; <div class="djep-actionbutton pointer" onclick="backToPlaylists();">Back To Playlists & Albums</div></div><br>${dataHTML}</div>`
      );
    }

    return (
      `<div style="margin-top:10px;"><h3 class="djep-h3">${playlistName} Tracks</h3><p align="center">No Tracks Found <br><br><span class="djep-actionbutton pointer" onclick="backToPlaylists();">Back To Playlists & Albums</span></p></div>`
    );
  }

  function bindSpotifyTrackDraggables(numberOfTracks) {
    if (!window.jQuery) return;
    for (let songCounter = 0; songCounter < numberOfTracks; songCounter += 1) {
      const node = window.jQuery(`#spotify_draggable_${songCounter}`);
      node.draggable({ appendTo: "body", helper: myHelper });
      node.draggable({ cursorAt: { top: -5, left: -5 } });
    }
  }

  function hasVisibleSpotifyBusyButton(spotifyTracksPanel) {
    if (!(spotifyTracksPanel instanceof HTMLElement)) return false;
    return Array.from(spotifyTracksPanel.querySelectorAll(".djep-addingplaylistbutton")).some((button) => {
      return button instanceof HTMLElement && button.style.display !== "none";
    });
  }

  function getTimelineRows(editor) {
    return Array.from(editor?.querySelectorAll('tr[id^="timeline_row_"]') || []);
  }

  function ensureTimelineMobileRuntimeStyles() {
    upsertRuntimeStyle(
      "djep-timeline-mobile-runtime",
      `
@media (max-width: 767px) {
  body.djep-timelinepage-ready .djep-timeline-mobile-activity-panel,
  body.djep-timelinepage-ready .djep-timeline-mobile-tools {
    display: grid !important;
    gap: 12px !important;
    margin: 0 0 16px !important;
    padding: 18px !important;
    border: 1px solid #dbe3ef !important;
    border-radius: 22px !important;
    background: rgba(255, 255, 255, 0.98) !important;
    box-shadow: 0 14px 28px rgba(17, 26, 46, 0.05) !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-panel[hidden],
  body.djep-timelinepage-ready .djep-timeline-mobile-tools[hidden] {
    display: none !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-header {
    display: grid !important;
    gap: 6px !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-label {
    color: #667085 !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-title {
    color: #101729 !important;
    font-size: 18px !important;
    font-weight: 800 !important;
    line-height: 1.3 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-copy,
  body.djep-timelinepage-ready .djep-timeline-mobile-caption {
    color: #667085 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    line-height: 1.6 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-grid {
    display: flex !important;
    gap: 8px !important;
    overflow-x: auto !important;
    padding: 0 0 2px !important;
    scrollbar-width: none !important;
    scroll-snap-type: x proximity !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-grid::-webkit-scrollbar {
    display: none !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-grid > [hidden] {
    display: none !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-footer {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    flex-wrap: wrap !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-summary {
    color: #101729 !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    line-height: 1.5 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-chip,
  body.djep-timelinepage-ready .djep-timeline-mobile-toggle,
  body.djep-timelinepage-ready .djep-timeline-mobile-activity-toggle {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 44px !important;
    padding: 0 14px !important;
    border-radius: 14px !important;
    border: 1px solid rgba(198, 207, 222, 0.96) !important;
    background: #f8fafc !important;
    color: #243049 !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    text-align: center !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-activity-chip {
    min-width: 0 !important;
    width: auto !important;
    flex: 0 0 auto !important;
    padding: 0 16px !important;
    white-space: nowrap !important;
    scroll-snap-align: start !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-tools-row {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    flex-wrap: wrap !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-summary {
    color: #101729 !important;
    font-size: 15px !important;
    font-weight: 800 !important;
    line-height: 1.35 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-toggle,
  body.djep-timelinepage-ready .djep-timeline-mobile-activity-toggle {
    padding: 0 16px !important;
    background: #ffffff !important;
    box-shadow: 0 6px 14px rgba(17, 26, 46, 0.05) !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row {
    display: block !important;
    padding: 12px !important;
    border: 1px solid rgba(219, 227, 239, 0.96) !important;
    border-radius: 20px !important;
    background: rgba(255, 255, 255, 0.98) !important;
    box-shadow: 0 10px 20px rgba(17, 26, 46, 0.05) !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row > td {
    display: grid !important;
    gap: 6px !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 0 0 10px !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row > td:last-child {
    margin-bottom: 0 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row input[type="text"],
  body.djep-timelinepage-ready .djep-timeline-mobile-row input:not([type]),
  body.djep-timelinepage-ready .djep-timeline-mobile-row textarea {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row > td:nth-child(1) input[type="text"],
  body.djep-timelinepage-ready .djep-timeline-mobile-row > td:nth-child(1) input:not([type]) {
    text-align: center !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row textarea {
    min-height: 88px !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row > td::before {
    content: attr(data-djep-mobile-label) !important;
    color: #667085 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    letter-spacing: 0.1em !important;
    text-transform: uppercase !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-row--comments-collapsed > td:nth-child(3) {
    display: none !important;
    margin: 0 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-native-controls {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 10px !important;
    margin: 0 !important;
    min-height: 0 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-control-cell {
    display: grid !important;
    grid-template-columns: 40px minmax(0, 1fr) !important;
    gap: 10px !important;
    align-items: start !important;
  }

  body.djep-timelinepage-ready .djep-timeline-control-cell::before {
    grid-column: 1 / -1 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-native-controls > * {
    display: none !important;
  }

  body.djep-timelinepage-ready .djep-timeline-native-controls > img[id^="timeline_icon_row_"] {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 38px !important;
    min-width: 38px !important;
    height: 38px !important;
    min-height: 38px !important;
    padding: 9px !important;
    border: 1px solid rgba(216, 223, 235, 0.94) !important;
    border-radius: 11px !important;
    background: #ffffff !important;
    box-shadow: 0 6px 14px rgba(17, 26, 46, 0.05) !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-actions {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 6px !important;
    width: 100% !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-action {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 36px !important;
    padding: 0 6px !important;
    border-radius: 11px !important;
    border: 1px solid rgba(216, 223, 235, 0.96) !important;
    background: #ffffff !important;
    color: #344054 !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    text-align: center !important;
    box-shadow: 0 6px 14px rgba(17, 26, 46, 0.05) !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-action:disabled {
    opacity: 0.45 !important;
    box-shadow: none !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-action--clear {
    background: #fff5f5 !important;
    border-color: rgba(180, 35, 24, 0.18) !important;
    color: #b42318 !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-action--notes {
    background: #f8fafc !important;
  }

  body.djep-timelinepage-ready .djep-timeline-mobile-action--notes.is-active {
    border-color: rgba(208, 49, 148, 0.28) !important;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(253, 244, 250, 0.98) 100%) !important;
    color: #b4238a !important;
  }
}
      `.trim()
    );
  }

  function createTimelineMobileToolsElement() {
    const tools = document.createElement("section");
    tools.className = "djep-timeline-mobile-tools";
    tools.innerHTML = `
      <div class="djep-timeline-mobile-tools-row">
        <div class="djep-timeline-mobile-summary"></div>
        <button type="button" class="djep-timeline-mobile-toggle"></button>
      </div>
      <div class="djep-timeline-mobile-caption"></div>
    `.trim();
    return tools;
  }

  function createTimelineMobileActivityPanelElement() {
    const panel = document.createElement("section");
    panel.className = "djep-timeline-mobile-activity-panel";
    panel.innerHTML = `
      <div class="djep-timeline-mobile-activity-header">
        <div class="djep-timeline-mobile-activity-label">Quick Add</div>
        <div class="djep-timeline-mobile-activity-title">Tap an activity to drop it into the next empty timeline row.</div>
        <div class="djep-timeline-mobile-activity-copy">This keeps the editor compact on mobile while preserving the full desktop timeline builder.</div>
      </div>
      <div class="djep-timeline-mobile-activity-grid"></div>
      <div class="djep-timeline-mobile-activity-footer">
        <div class="djep-timeline-mobile-activity-summary"></div>
        <button type="button" class="djep-timeline-mobile-activity-toggle"></button>
      </div>
    `.trim();
    return panel;
  }

  function getTimelineRowMobileLabels() {
    return ["Time", "Activity", "Comments", "Actions"];
  }

  function getTimelineVisibleUntil(lastFilledIndex, rowCount) {
    return Math.min(rowCount - 1, Math.max(lastFilledIndex + 2, 2));
  }

  function updateTimelineToolsSummary({ tools, filledCount, rowsCount, visibleUntil, collapsibleEmptyCount, expanded }) {
    const summary = tools?.querySelector(".djep-timeline-mobile-summary");
    const caption = tools?.querySelector(".djep-timeline-mobile-caption");
    const toggle = tools?.querySelector(".djep-timeline-mobile-toggle");

    if (summary) {
      summary.textContent = filledCount > 0
        ? `${filledCount} scheduled ${filledCount === 1 ? "activity" : "activities"}`
        : `${Math.min(rowsCount, visibleUntil + 1)} empty rows ready`;
    }

    if (caption) {
      caption.textContent = collapsibleEmptyCount
        ? `${collapsibleEmptyCount} extra empty rows are hidden to keep this mobile editor compact.`
        : "All available timeline rows are currently visible.";
    }

    if (toggle) {
      toggle.hidden = !expanded && collapsibleEmptyCount === 0;
      toggle.textContent = expanded ? "Collapse Empty Rows" : `Show ${collapsibleEmptyCount} More`;
    }
  }

  function updateTimelineActivityPanelSummary({ activityPanel, activityExpanded, compactActivityCount = 6 }) {
    const activityToggle = activityPanel?.querySelector(".djep-timeline-mobile-activity-toggle");
    const activitySummary = activityPanel?.querySelector(".djep-timeline-mobile-activity-summary");
    const activityButtons = Array.from(activityPanel?.querySelectorAll(".djep-timeline-mobile-activity-chip") || []);
    let hiddenActivityCount = 0;

    activityButtons.forEach((button, index) => {
      const showButton = activityExpanded || index < compactActivityCount;
      button.hidden = !showButton;
      if (!showButton) hiddenActivityCount += 1;
    });

    if (activitySummary) {
      activitySummary.textContent = hiddenActivityCount
        ? `${activityButtons.length} quick-add activities available.`
        : "All quick-add activities are visible.";
    }

    if (activityToggle) {
      activityToggle.hidden = !activityExpanded && hiddenActivityCount === 0;
      activityToggle.textContent = activityExpanded ? "Show Fewer" : `Show ${hiddenActivityCount} More`;
    }
  }

  function getTimelineMobileActionConfigs({ form, index, row, timelineRows, markTimelineDirty, refreshTimelineAfterAction }) {
    return [
      {
        className: "djep-timeline-mobile-action djep-timeline-mobile-action--notes",
        label: "Notes",
        handler: () => {
          const values = readTimelineRowValues(form, index);
          const currentState = row.dataset.djepTimelineCommentsState;
          const currentlyOpen = currentState === "1" || (currentState !== "0" && !!cleanText(values.comments));
          row.dataset.djepTimelineCommentsState = currentlyOpen ? "0" : "1";
          refreshTimelineAfterAction();
          if (!currentlyOpen) {
            runAfterDelays(() => form[`ett_comments_${index}`]?.focus?.(), [60]);
          }
        }
      },
      {
        className: "djep-timeline-mobile-action djep-timeline-mobile-action--up",
        label: "Up",
        handler: () => {
          if (index < 1) return;
          moveTimelineRow(form, index, index - 1);
          markTimelineDirty();
          refreshTimelineAfterAction();
        }
      },
      {
        className: "djep-timeline-mobile-action djep-timeline-mobile-action--down",
        label: "Down",
        handler: () => {
          const rowCount = timelineRows().length;
          if (index >= rowCount - 1) return;
          moveTimelineRow(form, index, index + 1);
          markTimelineDirty();
          refreshTimelineAfterAction();
        }
      },
      {
        className: "djep-timeline-mobile-action djep-timeline-mobile-action--clear",
        label: "Clear",
        handler: () => {
          writeTimelineRowValues(form, index, { time: "", name: "", comments: "" });
          markTimelineDirty();
          refreshTimelineAfterAction();
        }
      }
    ];
  }

  function ensureTimelineMobileToolsPanel({ editor, timelineEditorCell, mainRow, refreshTimelineMobilePresentation }) {
    if (!(timelineEditorCell instanceof HTMLElement)) return null;

    const timelineTable = mainRow?.querySelector(".djep-timelinetable");
    if (!(timelineTable instanceof HTMLElement)) return null;

    let tools = editor.querySelector(".djep-timeline-mobile-tools");
    if (!tools) {
      tools = createTimelineMobileToolsElement();
    }

    if (tools.parentElement !== timelineEditorCell) {
      timelineEditorCell.insertBefore(tools, timelineTable);
    }

    const toggle = tools.querySelector(".djep-timeline-mobile-toggle");
    if (bindDatasetOnce(toggle, "djepBound")) {
      toggle.addEventListener("click", () => {
        editor.dataset.djepTimelineExpanded = editor.dataset.djepTimelineExpanded === "1" ? "0" : "1";
        refreshTimelineMobilePresentation();
      });
    }

    return tools;
  }

  function getTimelineQuickAddLabels(mainRow) {
    return Array.from(mainRow?.querySelectorAll(".djep-activitytable .djep-timelineitems") || [])
      .map((node) => cleanText(node.textContent || ""))
      .filter(Boolean);
  }

  function ensureTimelineMobileActivityPanel({
    editor,
    timelineEditorCell,
    mainRow,
    timelineRows,
    form,
    markTimelineDirty,
    refreshTimelineAfterAction,
    refreshTimelineMobilePresentation,
  }) {
    if (!(timelineEditorCell instanceof HTMLElement)) return null;

    const sourceItems = getTimelineQuickAddLabels(mainRow);
    if (!sourceItems.length) return null;

    let panel = editor.querySelector(".djep-timeline-mobile-activity-panel");
    if (!panel) {
      panel = createTimelineMobileActivityPanelElement();
    }

    const anchor = editor.querySelector(".djep-timeline-mobile-tools") || mainRow?.querySelector(".djep-timelinetable");
    if (panel.parentElement !== timelineEditorCell) {
      timelineEditorCell.insertBefore(panel, anchor || timelineEditorCell.firstChild);
    }

    const grid = panel.querySelector(".djep-timeline-mobile-activity-grid");
    const toggle = panel.querySelector(".djep-timeline-mobile-activity-toggle");
    if (bindDatasetOnce(toggle, "djepBound")) {
      toggle.addEventListener("click", () => {
        editor.dataset.djepTimelineActivityExpanded = editor.dataset.djepTimelineActivityExpanded === "1" ? "0" : "1";
        refreshTimelineMobilePresentation();
      });
    }

    if (!(grid instanceof HTMLElement)) return panel;

    grid.innerHTML = "";
    sourceItems.forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "djep-timeline-mobile-activity-chip";
      button.textContent = label;
      button.addEventListener("click", (event) => {
        event.preventDefault();

        if (typeof window.jsNewAddActivity === "function") {
          window.jsNewAddActivity(label);
          markTimelineDirty();
        } else {
          const targetIndex = timelineRows().findIndex((row, index) => !timelineRowHasContent(form, index));
          if (targetIndex > -1) {
            const current = readTimelineRowValues(form, targetIndex);
            writeTimelineRowValues(form, targetIndex, {
              time: current.time,
              name: label,
              comments: current.comments
            });
            markTimelineDirty();
          }
        }

        refreshTimelineAfterAction();
      });
      grid.append(button);
    });

    panel.dataset.djepTimelineActivityCount = String(sourceItems.length);
    return panel;
  }

  function bindTimelineRowMobileFieldRefresh(row, markTimelineDirty, refreshTimelineMobilePresentation) {
    row.querySelectorAll("input, textarea").forEach((field) => {
      if (!bindDatasetOnce(field, "djepTimelineMobileRefreshBound")) return;
      field.addEventListener("input", () => {
        markTimelineDirty();
        if (field instanceof HTMLTextAreaElement) {
          row.dataset.djepTimelineCommentsState = "1";
          autosizeTextarea(field);
        }
        refreshTimelineMobilePresentation();
      });
      if (field instanceof HTMLTextAreaElement) {
        field.addEventListener("focus", () => {
          row.dataset.djepTimelineCommentsState = "1";
          refreshTimelineMobilePresentation();
        });
      }
      field.addEventListener("change", refreshTimelineMobilePresentation);
    });
  }

  function ensureTimelineRowActionBar({
    row,
    index,
    form,
    timelineRows,
    markTimelineDirty,
    refreshTimelineAfterAction,
  }) {
    const controlCell = row.querySelector("td:last-child");
    const controlWrap = controlCell?.querySelector("div");
    if (!controlCell || !controlWrap) return;

    controlCell.classList.add("djep-timeline-control-cell");
    controlWrap.classList.add("djep-timeline-native-controls");
    controlCell.querySelectorAll(".djep-timeline-delete-overlay").forEach((overlay) => overlay.remove());
    controlWrap.querySelectorAll("a").forEach((link) => link.remove());
    controlWrap.querySelectorAll("img:not([id^='timeline_icon_row_'])").forEach((icon) => icon.remove());

    const dragHandle =
      controlWrap.querySelector(`img#timeline_icon_row_${index}`) || controlWrap.querySelector('img[id^="timeline_icon_row_"]');
    if (dragHandle) {
      dragHandle.setAttribute("title", "Drag to reorder");
      dragHandle.setAttribute("alt", "Drag to reorder");
    }

    let actionBar = controlCell.querySelector(".djep-timeline-mobile-actions");
    if (actionBar && actionBar.tagName !== "NAV") {
      const replacement = document.createElement("nav");
      replacement.className = actionBar.className;
      replacement.innerHTML = actionBar.innerHTML;
      actionBar.replaceWith(replacement);
      actionBar = replacement;
    }

    if (!actionBar) {
      actionBar = document.createElement("nav");
      actionBar.className = "djep-timeline-mobile-actions";
      controlCell.append(actionBar);
    }

    if (!bindDatasetOnce(actionBar, "djepTimelineBound")) return;

    getTimelineMobileActionConfigs({
      form,
      index,
      row,
      timelineRows,
      markTimelineDirty,
      refreshTimelineAfterAction,
    }).forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.className;
      button.textContent = action.label;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        action.handler();
      });
      actionBar.append(button);
    });
  }

  function ensureTimelineMobileActionButtons({
    rows,
    form,
    timelineRows,
    markTimelineDirty,
    refreshTimelineAfterAction,
    refreshTimelineMobilePresentation,
  }) {
    rows.forEach((row, index) => {
      bindTimelineRowMobileFieldRefresh(row, markTimelineDirty, refreshTimelineMobilePresentation);
      ensureTimelineRowActionBar({
        row,
        index,
        form,
        timelineRows,
        markTimelineDirty,
        refreshTimelineAfterAction,
      });
    });
  }

  function normalizeTimelineMobileLayout({
    layoutTable,
    headerRow,
    mainRow,
    footerRow,
  }) {
    if (!isMobileViewport()) return;

    const layoutBody = layoutTable?.querySelector(":scope > tbody");
    const activityTable = mainRow?.querySelector(".djep-activitytable");
    const timelineTable = mainRow?.querySelector(".djep-timelinetable");
    const labels = getTimelineRowMobileLabels();

    [layoutTable, layoutBody, activityTable, timelineTable].forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.removeAttribute("width");
      node.style.width = "100%";
      node.style.maxWidth = "100%";
    });

    if (layoutTable instanceof HTMLElement) {
      layoutTable.style.setProperty("display", "block", "important");
    }

    if (layoutBody instanceof HTMLElement) {
      layoutBody.style.setProperty("display", "block", "important");
    }

    [headerRow, mainRow, footerRow].forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      row.style.setProperty("display", row === headerRow ? "none" : "block", "important");

      Array.from(row.children).forEach((cell) => {
        if (!(cell instanceof HTMLElement)) return;
        cell.removeAttribute("width");
        cell.style.setProperty("display", "block", "important");
        cell.style.width = "100%";
      });
    });

    if (headerRow instanceof HTMLElement) {
      headerRow.style.display = "none";
    }

    if (timelineTable instanceof HTMLTableElement) {
      Array.from(timelineTable.querySelectorAll("[width]")).forEach((node) => node.removeAttribute("width"));

      Array.from(timelineTable.rows).forEach((row, index) => {
        if (!(row instanceof HTMLTableRowElement)) return;

        if (row.querySelector(".djep-sectiontitle") || index === 0) {
          row.style.setProperty("display", "none", "important");
          return;
        }

        row.classList.add("djep-timeline-mobile-row");
        row.style.setProperty("display", "grid", "important");
        row.style.setProperty("grid-template-columns", "minmax(0, 1fr)", "important");
        Array.from(row.cells).forEach((cell, cellIndex) => {
          if (!(cell instanceof HTMLTableCellElement)) return;
          cell.removeAttribute("width");
          cell.style.setProperty("display", "block", "important");
          cell.style.width = "100%";
          cell.style.maxWidth = "100%";
          cell.style.minWidth = "0";
          cell.dataset.djepMobileLabel = labels[cellIndex] || "";
        });
      });
    }
  }

  function createTimelineMobilePresentationRefresher({
    editor,
    timelineEditorCell,
    timelineActivityCell,
    mainRow,
    timelineRows,
    form,
    readRows,
    refreshTimelineAfterAction,
    markTimelineDirty,
  }) {
    return function refreshTimelineMobilePresentation() {
      if (!isMobileViewport()) return;

      const rows = readRows();
      if (!rows.length) return;

      ensureTimelineMobileRuntimeStyles();
      const tools = ensureTimelineMobileToolsPanel({
        editor,
        timelineEditorCell,
        mainRow,
        refreshTimelineMobilePresentation,
      });
      const activityPanel = ensureTimelineMobileActivityPanel({
        editor,
        timelineEditorCell,
        mainRow,
        timelineRows,
        form,
        markTimelineDirty,
        refreshTimelineAfterAction,
        refreshTimelineMobilePresentation,
      });

      if (timelineActivityCell instanceof HTMLElement) {
        timelineActivityCell.style.setProperty("display", "none", "important");
      }

      if (timelineEditorCell instanceof HTMLElement) {
        timelineEditorCell.style.setProperty("display", "block", "important");
        timelineEditorCell.style.width = "100%";
      }

      let filledCount = 0;
      let lastFilledIndex = -1;

      rows.forEach((row, index) => {
        const values = readTimelineRowValues(form, index);
        const hasContent = `${values.time}${values.name}${values.comments}`.trim().length > 0;
        const commentsState = row.dataset.djepTimelineCommentsState;
        const commentsOpen = commentsState === "1" || (commentsState !== "0" && !!cleanText(values.comments));

        row.classList.toggle("djep-timeline-mobile-row--filled", hasContent);
        row.classList.toggle("djep-timeline-mobile-row--empty", !hasContent);
        row.classList.toggle("djep-timeline-mobile-row--comments-collapsed", !commentsOpen);
        row.classList.toggle("djep-timeline-mobile-row--comments-open", commentsOpen);

        if (hasContent) {
          filledCount += 1;
          lastFilledIndex = index;
        }
      });

      const visibleUntil = getTimelineVisibleUntil(lastFilledIndex, rows.length);
      const collapsibleEmptyCount = rows.reduce((count, row, index) => {
        if (row.classList.contains("djep-timeline-mobile-row--filled")) return count;
        return index > visibleUntil ? count + 1 : count;
      }, 0);
      const expanded = editor.dataset.djepTimelineExpanded === "1";

      rows.forEach((row, index) => {
        const hasContent = row.classList.contains("djep-timeline-mobile-row--filled");
        const showRow = expanded || hasContent || index <= visibleUntil;
        const commentsOpen = row.classList.contains("djep-timeline-mobile-row--comments-open");
        const commentsCell = row.cells[2];
        const actionCell = row.cells[3];
        const timeField = form[`ett_time_${index}`];
        const nameField = form[`ett_name_${index}`];
        const commentsField = form[`ett_comments_${index}`];

        row.style.setProperty("display", showRow ? "block" : "none", "important");
        row.classList.toggle("djep-timeline-mobile-row-hidden", !showRow);

        if (commentsCell instanceof HTMLElement) {
          commentsCell.style.setProperty("display", commentsOpen ? "grid" : "none", "important");
        }
        if (actionCell instanceof HTMLElement) {
          actionCell.style.setProperty("display", "grid", "important");
        }

        [timeField, nameField, commentsField].forEach((field) => {
          if (!(field instanceof HTMLElement)) return;
          field.style.width = "100%";
          field.style.maxWidth = "100%";
          field.style.minWidth = "0";
          field.style.boxSizing = "border-box";
        });
        if (commentsOpen && commentsField instanceof HTMLTextAreaElement) {
          autosizeTextarea(commentsField);
        }

        const upButton = row.querySelector(".djep-timeline-mobile-action--up");
        const downButton = row.querySelector(".djep-timeline-mobile-action--down");
        const clearButton = row.querySelector(".djep-timeline-mobile-action--clear");
        const notesButton = row.querySelector(".djep-timeline-mobile-action--notes");

        if (upButton) upButton.disabled = index === 0;
        if (downButton) downButton.disabled = index >= rows.length - 1;
        if (clearButton) clearButton.disabled = !hasContent;
        if (notesButton) {
          const commentsValue = cleanText(readTimelineRowValues(form, index).comments);
          notesButton.textContent = row.classList.contains("djep-timeline-mobile-row--comments-open")
            ? "Hide"
            : commentsValue
              ? "Show"
              : "Notes";
        }
      });

      updateTimelineToolsSummary({
        tools,
        filledCount,
        rowsCount: rows.length,
        visibleUntil,
        collapsibleEmptyCount,
        expanded,
      });
      updateTimelineActivityPanelSummary({
        activityPanel,
        activityExpanded: editor.dataset.djepTimelineActivityExpanded === "1",
      });

      rows.forEach((row) => {
        const notesButton = row.querySelector(".djep-timeline-mobile-action--notes");
        if (!notesButton) return;
        const commentsOpen = row.classList.contains("djep-timeline-mobile-row--comments-open");
        notesButton.classList.toggle("is-active", commentsOpen);
        notesButton.setAttribute("aria-pressed", commentsOpen ? "true" : "false");
      });
    };
  }

  function initializeTimelineMobileExperience({
    editor,
    rows,
    form,
    timelineRows,
    markTimelineDirty,
    refreshTimelineAfterAction,
    refreshTimelineMobilePresentation,
  }) {
    if (!isMobileViewport()) return;

    ensureTimelineMobileActionButtons({
      rows,
      form,
      timelineRows,
      markTimelineDirty,
      refreshTimelineAfterAction,
      refreshTimelineMobilePresentation,
    });
    refreshTimelineMobilePresentation();

    if (bindDatasetOnce(editor, "djepTimelineMobileResizeBound")) {
      window.addEventListener("resize", refreshTimelineMobilePresentation, { passive: true });
    }
  }

  function initTimelinePage() {
    const editor = document.querySelector(".djep-edittimelinebox, .djep-timeline-panel");
    const form = document.getElementById("ep_form");
    if (!editor || !form) return;

    document.body.classList.add("djep-timelinepage-ready");

    const contentRoot = document.getElementById("djep-content");
    const pageHeading = document.querySelector("#djep-content > h2.djep-h2");
    const titlebar = editor.querySelector(":scope > .djep-titlebar");
    const layoutTable = editor.querySelector(":scope > table");
    const headerRow = layoutTable?.querySelector("#djep-timelinerow_header");
    const mainRow = layoutTable?.querySelector("#djep-timelinerow_main");
    const footerRow = layoutTable?.querySelector("#djep-timelinerow_footer");
    const instructionsBox = headerRow?.querySelector(".djep-timeline_instructions");
    const timelineHeadline = headerRow?.querySelector("#djep-timelineheadline");
    const timelineSaveButton =
      footerRow?.querySelector('input[type="submit"], button[type="submit"]') ||
      form.querySelector('#djep-timelinerow_footer input[type="submit"], #djep-timelinerow_footer button[type="submit"]') ||
      form.querySelector('input[type="submit"], button[type="submit"]');
    const timelineInstructionsText =
      cleanText(instructionsBox?.textContent || "") ||
      "Click on the activity below to add to the timeline. You can also drag and drop timeline items to empty rows.";
    const timelineRows = () => getTimelineRows(editor);
    const timelineEditorCell = mainRow?.querySelector(":scope > td:last-child");
    const timelineActivityCell = mainRow?.querySelector(":scope > td:first-child");

    const markTimelineDirty = () => {
      markFormDirty();
    };

    const refreshTimelineAfterAction = () => {
      window.setTimeout(() => {
        editor.querySelectorAll(".djep-timelinetextbox3").forEach(autosizeTextarea);
        refreshTimelineMobilePresentation();
      }, 40);
    };
    const refreshTimelineMobilePresentation = createTimelineMobilePresentationRefresher({
      editor,
      timelineEditorCell,
      timelineActivityCell,
      mainRow,
      timelineRows,
      form,
      readRows: timelineRows,
      refreshTimelineAfterAction,
      markTimelineDirty,
    });

    if (instructionsBox && !instructionsBox.dataset.djepTimelineCopyClean) {
      instructionsBox.dataset.djepTimelineCopyClean = "1";
      instructionsBox.textContent = timelineInstructionsText;
    }

    normalizeTimelinePageHeading(pageHeading);
    editor.classList.remove("djep-edittimelinebox");
    editor.classList.add("djep-timeline-panel");
    initializeTimelineStructure({
      form,
      editor,
      contentRoot,
      pageHeading,
      titlebar,
      headerRow,
      mainRow,
      footerRow,
      timelineHeadline,
      timelineSaveButton,
    });

    headerRow?.classList.add("djep-timeline-header-row-hidden");

    ensureTimelineTopSaveButton(form, titlebar, timelineSaveButton);
    normalizeTimelineTitlebar(titlebar, timelineHeadline, timelineInstructionsText);

    bindTimelineDropTargets(editor);
    normalizeTimelineNativeRowControls(editor);

    const headline = editor.querySelector("#djep-timelineheadline");
    if (headline) {
      headline.style.width = "";
      headline.style.height = "";
      autosizeTextarea(headline);
    }

    editor.querySelectorAll(".djep-timelinetextbox3").forEach(autosizeTextarea);
    normalizeTimelineMobileLayout({
      layoutTable,
      headerRow,
      mainRow,
      footerRow,
    });

    initializeTimelineMobileExperience({
      editor,
      rows: timelineRows(),
      form,
      timelineRows,
      markTimelineDirty,
      refreshTimelineAfterAction,
      refreshTimelineMobilePresentation,
    });

    if (contentRoot instanceof HTMLElement) {
      const nextChildren = [];
      if (pageHeading instanceof HTMLElement) nextChildren.push(pageHeading);
      nextChildren.push(form);
      contentRoot.replaceChildren(...nextChildren);
    }
  }

  function initEventDetailsPage() {
    const root = document.getElementById("page_eventdetails");
    if (!root || root.dataset.djepEventDetailsInit) return;
    root.dataset.djepEventDetailsInit = "1";
    root.classList.add("djep-eventdetails-ready");

    const pageHeading = root.previousElementSibling;
    const eventDateBox = root.querySelector(".djep-eventdatetimesbox");
    const eventDescriptionBox = root.querySelector(".djep-eventdescriptionbox");
    const venueBox = root.querySelector(".djep-venueinfobox");
    const serviceDetailsBox = root.querySelector(".djep-servicedetailsbox");
    const feeDetailsBox = root.querySelector(".djep-feedetailsbox");
    const totalsBox = root.querySelector(".djep-totalfeebox");
    const staffingBox = root.querySelector(".djep-staffingbox");
    const paymentHistoryBox = root.querySelector(".djep-paymenthistorybox");
    const documentsBox = root.querySelector(".djep-documentsbox");
    const relatedFilesBox = root.querySelector(".djep-relatedfilesbox");
    const requestChangesBox = root.querySelector(".djep-requestchangesbox");
    const financeSummaryBox = root.querySelector(".djep-paymentsfinancesbox");
    const paymentButton = root.querySelector(
      ".djep-paymenthistorybox .djep-paymentbutton, .djep-paymentsfinancesbox .djep-paymentbutton, .djep-paymentbutton"
    );

    normalizeEventDetailsHeading(pageHeading);

    const eventDateValue = readEventDetailsTableValue(eventDateBox, "event date:");
    const eventTypeValue = readEventDetailsTableValue(eventDescriptionBox, "event type:");
    const bookingStatusValue = readEventDetailsTableValue(eventDescriptionBox, "booking status:");
    const eventIdValue = readEventDetailsTableValue(eventDescriptionBox, "event id:");
    const venueName = (venueBox?.querySelector("#djep-venue_1_name")?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    mountEventDetailsHeadingMeta(pageHeading, {
      eventDateValue,
      eventTypeValue,
      bookingStatusValue,
      eventIdValue,
      venueName,
    });

    pruneEmptyEventDetailsRows(eventDateBox, eventDescriptionBox);

    simplifyEventDetailsVenueBox(venueBox);
    normalizeEventDetailsFeeRows(root);
    normalizeEventDetailsTotalRows(root);
    normalizeEventDetailsStaffRows(staffingBox);
    buildEventDetailsStaffList(staffingBox);

    documentsBox?.querySelectorAll("tr").forEach((row) => {
      const statusCell = row.querySelector("td:nth-child(2) .djep-esigned")?.closest("td");
      if (statusCell) {
        statusCell.remove();
      }
    });

    simplifyEventDetailsRequestCopy(requestChangesBox);

    buildEventDetailsWorkspace({
      root,
      eventDateBox,
      venueBox,
      staffingBox,
      requestChangesBox,
      feeDetailsBox,
      totalsBox,
      paymentButton,
      documentsBox,
    });

    cleanupEventDetailsRoot(root, documentsBox);
    cleanupEventDetailsSources({
      eventDescriptionBox,
      paymentHistoryBox,
      financeSummaryBox,
      serviceDetailsBox,
      relatedFilesBox,
    });
    finalizeEventDetailsCleanClasses({
      eventDateBox,
      venueBox,
      feeDetailsBox,
      totalsBox,
      staffingBox,
      requestChangesBox,
      documentsBox,
    });
  }

  function ensureMusicShellHead(container, className, labelText, copyText) {
    if (!(container instanceof HTMLElement)) return null;

    let head = container.querySelector(`:scope > .${className}`);
    if (!head) {
      head = document.createElement("div");
      head.className = `djep-music-shell-head ${className}`;

      const label = document.createElement("div");
      label.className = "djep-music-shell-head-label";
      label.textContent = labelText;

      const copy = document.createElement("p");
      copy.className = "djep-music-shell-head-copy";
      copy.textContent = copyText;

      head.append(label, copy);
      container.insertBefore(head, container.firstChild || null);
    }

    return head;
  }

  function prepareMusicShellColumns({ browserCell, requestsCell, tabs, requestsAccordion, requestLimitBox, successBanner }) {
    browserCell?.classList.add("djep-music-browser-column");
    requestsCell?.classList.add("djep-music-requests-column");
    tabs?.classList.add("djep-music-browser-shell");

    if (tabs instanceof HTMLElement) {
      tabs.style.setProperty("display", "grid", "important");
      tabs.style.setProperty("gap", "12px", "important");
      tabs.style.setProperty("border", "1.25px solid #dbe3ef", "important");
      tabs.style.setProperty("border-radius", "26px", "important");
      tabs.style.setProperty("background", "linear-gradient(180deg, #fcfdff 0%, #f7f9fc 100%)", "important");
      tabs.style.setProperty("box-shadow", "inset 0 1px 0 rgba(255, 255, 255, 0.9)", "important");
    }

    requestsAccordion?.classList.add("djep-music-requests-accordion");
    requestLimitBox?.classList.add("djep-music-requestlimit");
    successBanner?.classList.add("djep-music-success-banner");
  }

  function removeMusicInstructionsAndSetPlaceholders({ musicBox, requestsContent, tabs }) {
    requestsContent?.querySelectorAll(":scope > br").forEach((node) => node.remove());

    const instructions = Array.from(musicBox?.querySelectorAll("div") || []).find((node) => {
      const text = cleanText(node.textContent || "");
      return text.startsWith("Instructions:") && text.includes("Search for songs using the options above");
    });

    if (instructions) {
      instructions.remove();
    }

    const artistSearch = tabs?.querySelector("#search_by_artist_search_string");
    if (artistSearch && !artistSearch.getAttribute("placeholder")) {
      artistSearch.setAttribute("placeholder", "Search by artist");
    }

    const songSearch = tabs?.querySelector("#search_by_song_search_string");
    if (songSearch && !songSearch.getAttribute("placeholder")) {
      songSearch.setAttribute("placeholder", "Search by song title");
    }

    return instructions instanceof HTMLElement ? instructions : null;
  }

  function findMusicControlTable(panel) {
    if (!(panel instanceof HTMLElement)) return null;
    return Array.from(panel.querySelectorAll(":scope > table")).find((table) => {
      return table.querySelector("a.djep-artistsongbuttons, input[type='text'], select, .djep-searchbutton");
    }) || null;
  }

  function pruneMusicSpacerRows(table) {
    if (!(table instanceof HTMLElement)) return;
    Array.from(table.querySelectorAll("tr")).forEach((row) => {
      const hasInteractive = row.querySelector("a, button, input, select, textarea, img");
      const text = cleanText(row.textContent || "");
      if (!hasInteractive && !text) {
        row.remove();
      }
    });
  }

  function convertTopHitsOptionsToDropdown() {
    const header = document.getElementById("most_requested_music_results_header");
    if (!(header instanceof HTMLElement)) return;
    if (header.querySelector(".djep-music-top-hits-dropdown")) return;

    const optionLinks = Array.from(
      header.querySelectorAll("a[id^='get_most_requested_songs_']")
    ).filter((link) => {
      const href = link.getAttribute("href") || "";
      return !href.includes("jsScrollToElementInMostRequestedDiv") && !href.includes("jsScrollToElementInShazamDiv");
    });

    if (optionLinks.length < 4) return;

    const isDecadeSet = optionLinks.every((link) => /_(50s|60s|70s|80s|90s|00s|10s|20s)_link$/i.test(link.id || ""));
    const isWeddingSet = optionLinks.every((link) => {
      const id = link.id || "";
      return (
        id.includes("_bride_groom_dance_") ||
        id.includes("_bride_father_dance_") ||
        id.includes("_mother_son_dance_") ||
        id.includes("_wedding_party_dance_") ||
        id.includes("_last_dance_") ||
        id.includes("_cake_cutting_") ||
        id.includes("_bouquet_") ||
        id.includes("_garter_") ||
        id.includes("_couples_dance_") ||
        id.includes("_introduction_")
      );
    });

    if (!isDecadeSet && !isWeddingSet) return;

    const wrap = document.createElement("div");
    wrap.className = "djep-music-top-hits-dropdown-wrap";

    const select = document.createElement("select");
    select.className = "djep-songideasdropdown djep-music-top-hits-dropdown";

    const placeholder = document.createElement("option");
    placeholder.selected = true;
    placeholder.disabled = true;
    placeholder.textContent = isDecadeSet ? "Select a decade" : "Select a wedding moment";
    select.append(placeholder);

    optionLinks.forEach((link) => {
      const option = document.createElement("option");
      option.value = link.id || "";
      option.textContent = cleanText(link.textContent || "");
      select.append(option);
    });

    select.addEventListener("change", () => {
      const selectedLink = optionLinks.find((link) => (link.id || "") === select.value);
      selectedLink?.click();
    });

    wrap.append(select);
    header.innerHTML = "";
    header.append(wrap);
  }

  function patchTopHitsOptionFunctions(form) {
    if (!(form instanceof HTMLElement) || form.dataset.djepTopHitsOptionPatch === "1") return;
    form.dataset.djepTopHitsOptionPatch = "1";

    ["jsShowDecadeOptions", "jsShowWeddingOptions"].forEach((fnName) => {
      const original = typeof window[fnName] === "function" ? window[fnName] : null;
      if (!original || original.__djepWrapped) return;

      const wrapped = function djepTopHitsOptionsPatched() {
        const result = original.apply(this, arguments);
        window.requestAnimationFrame(convertTopHitsOptionsToDropdown);
        return result;
      };
      wrapped.__djepWrapped = true;
      window[fnName] = wrapped;
    });
  }

  function observeTopHitsHeader() {
    const header = document.getElementById("most_requested_music_results_header");
    if (!(header instanceof HTMLElement) || header.dataset.djepTopHitsObserverBound === "1") return;
    header.dataset.djepTopHitsObserverBound = "1";

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(convertTopHitsOptionsToDropdown);
    });

    observer.observe(header, {
      childList: true,
      subtree: true,
    });
  }

  function syncTopHitsPrimaryButtons() {
    const mostRequestedButton = document.getElementById("show_top_hit_buttons");
    const chartsButton = document.getElementById("show_chart_buttons");
    const mostRequestedRow = document.getElementById("mrs_buttons");
    const chartsRow = document.getElementById("apicharts_buttons");

    const isVisible = (node) =>
      node instanceof HTMLElement && window.getComputedStyle(node).display !== "none";

    const mostRequestedActive = isVisible(mostRequestedRow) && !isVisible(chartsRow);
    const chartsActive = isVisible(chartsRow) && !isVisible(mostRequestedRow);

    const setButtonState = (button, active) => {
      if (!(button instanceof HTMLElement)) return;
      button.classList.toggle("djep-toplistbuttons_active", active);
      button.classList.toggle("mainbuttonactive", active);
    };

    setButtonState(mostRequestedButton, mostRequestedActive);
    setButtonState(chartsButton, chartsActive);
  }

  function keepTopHitsDropdownSynced(form, tabs) {
    if (!(form instanceof HTMLElement) || form.dataset.djepTopHitsSyncBound === "2") return;
    form.dataset.djepTopHitsSyncBound = "2";

    window.setInterval(() => {
      const topHitsPanel = tabs?.querySelector("#tabs-4");
      if (!(topHitsPanel instanceof HTMLElement)) return;
      if (window.getComputedStyle(topHitsPanel).display === "none") return;
      convertTopHitsOptionsToDropdown();
      syncTopHitsPrimaryButtons();
    }, 400);
  }

  function bindTopHitsTabDropdownRefresh(tabs) {
    if (!(tabs instanceof HTMLElement) || tabs.dataset.djepTopHitsTabRefreshBound === "2") return;
    tabs.dataset.djepTopHitsTabRefreshBound = "2";

    tabs.addEventListener(
      "click",
      (event) => {
        const trigger = event.target.closest("a, button");
        if (!(trigger instanceof HTMLElement)) return;
        const triggerText = cleanText(trigger.textContent || "").toLowerCase();
        if (
          triggerText !== "top hits" &&
          triggerText !== "decade" &&
          triggerText !== "wedding" &&
          triggerText !== "most requested songs" &&
          triggerText !== "charts and top hits" &&
          triggerText !== "top 200" &&
          triggerText !== "apple" &&
          triggerText !== "tiktok" &&
          triggerText !== "shazam"
        ) {
          return;
        }
        window.requestAnimationFrame(convertTopHitsOptionsToDropdown);
        window.requestAnimationFrame(syncTopHitsPrimaryButtons);
        window.setTimeout(convertTopHitsOptionsToDropdown, 120);
        window.setTimeout(syncTopHitsPrimaryButtons, 120);
      },
      true
    );
  }

  function buildMusicMetaChip(labelText, valueText) {
    const chip = document.createElement("div");
    chip.className = "djep-music-meta-chip";

    const label = document.createElement("span");
    label.className = "djep-music-meta-chip-label";
    label.textContent = labelText;

    const value = document.createElement("span");
    value.className = "djep-music-meta-chip-value";
    value.textContent = valueText;

    chip.append(label, value);
    return chip;
  }

  function parseMusicNumericSuffix(text) {
    const match = cleanText(text || "").match(/([0-9]+)\s*$/);
    return match ? match[1] : "";
  }

  function getMusicOverallLimitValue(requestLimitBox) {
    const computedLimit =
      typeof window.jsGetMaximumRequests === "function" ? Number(window.jsGetMaximumRequests("ALL")) : NaN;
    if (Number.isFinite(computedLimit) && computedLimit > 0 && computedLimit < 9999) {
      return String(computedLimit);
    }

    const limitText = requestLimitBox?.querySelector("#playlist_limit_span_ALL")?.textContent || "";
    return parseMusicNumericSuffix(limitText);
  }

  function getRequestsOnlyAddedCount(requestsAccordion) {
    if (!(requestsAccordion instanceof HTMLElement)) return "";
    return String(
      Array.from(requestsAccordion.querySelectorAll("table[id^='request_table_']")).reduce((total, table) => {
        if (!(table instanceof HTMLTableElement) || table.id.endsWith("_ALL")) return total;
        return total + table.querySelectorAll("tr").length;
      }, 0)
    );
  }

  function ensureMusicMetaChip(meta, labelText) {
    const normalizedLabel = labelText.trim().toLowerCase();
    const existingChip = Array.from(meta.querySelectorAll(".djep-music-meta-chip")).find((chip) => {
      const chipLabel = chip.querySelector(".djep-music-meta-chip-label");
      return cleanText(chipLabel?.textContent || "").toLowerCase() === normalizedLabel;
    });

    if (existingChip) return existingChip;

    const chip = buildMusicMetaChip(labelText, "");
    meta.append(chip);
    return chip;
  }

  function syncMusicRequestMeta({ requestsContent, requestsCell, requestsAccordion, requestLimitBox }) {
    if (!(requestsContent instanceof HTMLElement)) return;
    const requestsHeadNode = requestsCell?.querySelector(".djep-music-requests-head");

    if (requestsHeadNode instanceof HTMLElement) {
      requestsHeadNode.querySelectorAll(".djep-music-request-meta").forEach((node) => node.remove());
    }

    if (requestsCell instanceof HTMLElement) {
      Array.from(requestsCell.querySelectorAll(":scope > .djep-music-request-meta"))
        .filter((node) => !requestsContent.contains(node))
        .forEach((node) => node.remove());
    }

    let meta = requestsContent.querySelector(":scope > .djep-music-request-meta");
    if (!(meta instanceof HTMLElement)) {
      meta = document.createElement("div");
      meta.className = "djep-music-request-meta djep-music-request-meta--footer";
    } else {
      meta.classList.add("djep-music-request-meta--footer");
    }

    const overallChip = ensureMusicMetaChip(meta, "Overall Limit");
    const overallValue = overallChip.querySelector(".djep-music-meta-chip-value");
    if (overallValue) {
      overallValue.textContent = getMusicOverallLimitValue(requestLimitBox);
    }

    const addedChip = ensureMusicMetaChip(meta, "Added So Far");
    const addedValue = addedChip.querySelector(".djep-music-meta-chip-value");
    if (addedValue) {
      addedValue.textContent = getRequestsOnlyAddedCount(requestsAccordion);
    }

    const playlistsBlock = requestsContent.querySelector(":scope > #saved_playlists_content");
    const playlistsEmptyBlock = requestsContent.querySelector(":scope > .djep-music-playlists-empty");

    if (requestsAccordion instanceof HTMLElement && requestsAccordion.parentElement === requestsContent) {
      if (requestsAccordion.nextElementSibling !== meta) {
        requestsAccordion.insertAdjacentElement("afterend", meta);
      }
    } else if (playlistsBlock instanceof HTMLElement) {
      requestsContent.insertBefore(meta, playlistsBlock);
    } else if (playlistsEmptyBlock instanceof HTMLElement) {
      requestsContent.insertBefore(meta, playlistsEmptyBlock);
    } else {
      requestsContent.append(meta);
    }

    const currentView = requestsContent.dataset.djepMusicRequestView || "requests";
    meta.hidden = currentView !== "requests";
    meta.style.display = currentView === "requests" ? "" : "none";
  }

  const musicNavPillStyles = {
    active: {
      border: "1px solid rgba(196, 207, 223, 0.98)",
      background: "linear-gradient(180deg, rgba(245, 248, 252, 0.98), rgba(235, 241, 248, 0.98))",
      backgroundColor: "rgba(242, 246, 251, 0.98)",
      boxShadow: "0 8px 16px rgba(35, 48, 73, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92)",
      color: "#243049",
    },
    inactive: {
      border: "1px solid transparent",
      background: "transparent",
      backgroundColor: "rgba(0, 0, 0, 0)",
      boxShadow: "none",
      color: "#526078",
    },
    hover: {
      border: "1px solid rgba(215, 223, 236, 0.96)",
      background: "rgba(27, 37, 57, 0.06)",
      backgroundColor: "rgba(27, 37, 57, 0.06)",
      boxShadow: "none",
      color: "#243049",
    },
  };

  function applyMusicNavAnchorState(anchor, styleState) {
    if (!(anchor instanceof HTMLElement) || !styleState) return;
    anchor.style.setProperty("border", styleState.border, "important");
    anchor.style.setProperty("background", styleState.background, "important");
    anchor.style.setProperty("background-color", styleState.backgroundColor, "important");
    anchor.style.setProperty("box-shadow", styleState.boxShadow, "important");
    anchor.style.setProperty("color", styleState.color, "important");
    anchor.style.setProperty("-webkit-text-fill-color", styleState.color, "important");
  }

  function applyMusicNavPills(tabsNav) {
    if (!(tabsNav instanceof HTMLElement)) return;

    Array.from(tabsNav.children).forEach((item) => {
      const anchor = item.querySelector("a");
      if (!anchor) return;

      const isSpotify = !!item.querySelector("img");
      const isUtility = item.classList.contains("addyourownlink");
      const isActive = item.classList.contains("ui-tabs-active") || item.classList.contains("ui-state-active");
      const isHidden = item.getAttribute("style")?.includes("display:none") || window.getComputedStyle(item).display === "none";

      if (isHidden) {
        item.style.display = "none";
        return;
      }

      item.style.setProperty("margin", "0", "important");
      item.style.setProperty("padding", "0", "important");
      item.style.setProperty("border-radius", "999px", "important");
      item.style.setProperty("border", "0", "important");
      item.style.setProperty("background", "transparent", "important");
      item.style.setProperty("background-image", "none", "important");
      item.style.setProperty("box-shadow", "none", "important");

      anchor.style.setProperty("display", "inline-flex", "important");
      anchor.style.setProperty("align-items", "center", "important");
      anchor.style.setProperty("justify-content", "center", "important");
      anchor.style.setProperty("min-height", "36px", "important");
      anchor.style.setProperty("min-width", isSpotify ? "30px" : (isUtility ? "88px" : ""), "important");
      anchor.style.setProperty("padding", isSpotify ? "0" : "0 6px", "important");
      anchor.style.setProperty("border-radius", "999px", "important");
      anchor.style.setProperty("font-size", isUtility ? "12px" : "11px", "important");
      anchor.style.setProperty("font-weight", "800", "important");
      anchor.style.setProperty("letter-spacing", isUtility ? "0.04em" : "0.06em", "important");
      anchor.style.setProperty("text-transform", "uppercase", "important");
      anchor.style.setProperty("text-decoration", "none", "important");
      anchor.style.setProperty("background-image", "none", "important");

      applyMusicNavAnchorState(anchor, isActive ? musicNavPillStyles.active : musicNavPillStyles.inactive);

      if (!item.dataset.djepMusicTabHover) {
        item.dataset.djepMusicTabHover = "1";
        item.addEventListener("mouseenter", () => {
          const currentActive = item.classList.contains("ui-tabs-active") || item.classList.contains("ui-state-active");
          if (currentActive) return;
          applyMusicNavAnchorState(anchor, musicNavPillStyles.hover);
        });
        item.addEventListener("mouseleave", () => {
          applyMusicNavPills(tabsNav);
        });
      }
    });
  }

  function forceActiveMusicNavState(tabsNav) {
    if (!(tabsNav instanceof HTMLElement)) return;
    const activeItems = Array.from(
      tabsNav.querySelectorAll(":scope > li.ui-tabs-active, :scope > li.ui-state-active")
    );
    activeItems.forEach((item) => {
      const anchor = item.querySelector("a");
      if (!(anchor instanceof HTMLElement)) return;
      applyMusicNavAnchorState(anchor, musicNavPillStyles.active);
    });
  }

  function syncMusicTabLabels(tabsNav) {
    if (!(tabsNav instanceof HTMLElement)) return;
    Array.from(tabsNav.querySelectorAll("a")).forEach((anchor) => {
      const currentText = cleanText(anchor.textContent || "");
      const label = currentText.toLowerCase();
      if (label === "ideas" && currentText !== "Genres") {
        anchor.textContent = "Genres";
        return;
      }
      if (label === "add your own" && currentText !== "ADD YOUR OWN") {
        anchor.textContent = "ADD YOUR OWN";
      }
    });
  }

  function showMusicTab({ item, tabsNav, tabPanels }) {
    if (!(item instanceof HTMLElement) || !(tabsNav instanceof HTMLElement)) return;
    const anchor = item.querySelector("a");
    const panelId = item.getAttribute("aria-controls") || anchor?.getAttribute("href")?.split("#")[1];
    if (!panelId) return;

    Array.from(tabsNav.children).forEach((navItem) => {
      navItem.classList.remove("ui-tabs-active", "ui-state-active");
      navItem.setAttribute("aria-selected", "false");
      navItem.setAttribute("tabindex", "-1");
    });

    tabPanels.forEach((panel) => {
      const isTarget = panel.id === panelId;
      panel.style.display = isTarget ? "" : "none";
      panel.setAttribute("aria-hidden", isTarget ? "false" : "true");
      panel.setAttribute("aria-expanded", isTarget ? "true" : "false");
    });

    item.classList.add("ui-tabs-active", "ui-state-active");
    item.setAttribute("aria-selected", "true");
    item.setAttribute("tabindex", "0");
    applyMusicNavPills(tabsNav);
    if (typeof window.__djepSyncSpotifyPanelVisibility === "function") {
      window.__djepSyncSpotifyPanelVisibility(panelId);
      window.setTimeout(() => window.__djepSyncSpotifyPanelVisibility(panelId), 0);
      window.setTimeout(() => window.__djepSyncSpotifyPanelVisibility(panelId), 180);
      window.setTimeout(() => window.__djepSyncSpotifyPanelVisibility(panelId), 420);
    }
  }

  function removeMusicNativeSelectionNav(requestsContent) {
    const nativeSelectionNav = requestsContent?.parentElement?.querySelector(".djep-music_selections_navigation");
    if (!(nativeSelectionNav instanceof HTMLElement)) return;
    const nextSibling = nativeSelectionNav.nextElementSibling;
    if (nextSibling?.tagName === "BR") nextSibling.remove();
    nativeSelectionNav.remove();
  }

  function collectMusicRequestProtectedNodes(requestsContent) {
    const protectedNodes = new Set();
    requestsContent
      ?.querySelectorAll(
        ".djep-music-request-switcher, .djep-music-request-view, .djep-music-request-meta, #requests_accordion, #saved_playlists_content, .djep-requestlimitbox"
      )
      .forEach((node) => protectedNodes.add(node));
    return protectedNodes;
  }

  function cleanupLegacyMusicRequestControls(requestsContent, protectedNodes) {
    requestsContent
      ?.querySelectorAll("div, table, tbody, tr, td, p, section")
      .forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (
          protectedNodes.has(node) ||
          Array.from(protectedNodes).some((protectedNode) => protectedNode.contains(node) || node.contains(protectedNode))
        ) {
          return;
        }

        const controlLabels = Array.from(
          node.querySelectorAll("button, a, input[type='button'], input[type='submit']")
        )
          .map((control) => cleanText(control.textContent || control.value || "").toLowerCase())
          .filter(Boolean);

        const hasRequestsControl = controlLabels.some((label) => label === "requests");
        const hasPlaylistsControl = controlLabels.some(
          (label) => label === "playlists" || label === "spotify playlists"
        );

        if (!hasRequestsControl || !hasPlaylistsControl) return;

        const removable =
          node.closest("div") && requestsContent.contains(node.closest("div")) ? node.closest("div") : node;
        if (
          removable instanceof HTMLElement &&
          !protectedNodes.has(removable) &&
          !Array.from(protectedNodes).some((protectedNode) => removable.contains(protectedNode))
        ) {
          removable.remove();
        }
      });
  }

  function attachMusicRequestsPane({
    requestsContent,
    requestsAccordion,
    refreshMusicEmptyStates,
    refreshMusicRequestMobilePresentation,
    normalizeAccordionWidths,
  }) {
    let requestsPane = requestsContent?.querySelector(":scope > .djep-music-request-view--requests");
    if (requestsPane instanceof HTMLElement) {
      requestsPane.replaceWith(...Array.from(requestsPane.childNodes));
    }

    if (requestsAccordion?.parentNode !== requestsContent) {
      requestsContent?.append(requestsAccordion);
    }

    configureAccordionForClick(requestsAccordion, () => {
      refreshMusicEmptyStates();
      if (typeof window.jsHideAllRequestSavedMessages === "function") {
        window.jsHideAllRequestSavedMessages();
      }
      refreshMusicRequestMobilePresentation();
    }, normalizeAccordionWidths);
    bindRequestsScrollProxy(requestsContent);
  }

  function attachMusicPlaylistsPane({ requestsContent, requestsCell, normalizeAccordionWidths }) {
    const nativePlaylistsContent = requestsCell?.querySelector("#saved_playlists_content");
    const savedPlaylistsAccordion = nativePlaylistsContent?.querySelector("#saved_playlists_accordion");

    if (nativePlaylistsContent) {
      nativePlaylistsContent.style.display = "";
      nativePlaylistsContent.classList.add("djep-music-native-playlists");
      nativePlaylistsContent.classList.remove("djep-music-request-view", "djep-music-request-view--playlists");
      if (savedPlaylistsAccordion instanceof HTMLElement) {
        configureAccordionForClick(savedPlaylistsAccordion, () => {
          const activePanel = savedPlaylistsAccordion.querySelector(".ui-accordion-content-active");
          const scrollFrame = activePanel?.querySelector("[id^='request_table_div_']");
          if (scrollFrame instanceof HTMLElement) {
            scrollFrame.style.overflowY = "hidden";
            void scrollFrame.offsetHeight;
            scrollFrame.style.overflowY = "auto";
            scrollFrame.style.webkitOverflowScrolling = "touch";
            scrollFrame.style.touchAction = "pan-y";
          }
        }, normalizeAccordionWidths);
      }
      bindSavedPlaylistEditTriggers(nativePlaylistsContent);
      bindSavedPlaylistScrollProxy(nativePlaylistsContent);
      if (nativePlaylistsContent.parentElement !== requestsContent) {
        requestsContent?.append(nativePlaylistsContent);
      }
      return;
    }

    requestsContent
      ?.querySelectorAll(":scope > .djep-music-request-view--playlists, :scope > .djep-music-playlists-empty")
      .forEach((node) => node.remove());
    const playlistsPane = document.createElement("div");
    playlistsPane.className = "djep-music-playlists-empty";
    const empty = document.createElement("div");
    empty.innerHTML = "<strong>No playlists available.</strong><span>Spotify playlists will appear here when a connected playlist is available in DJEP.</span>";
    playlistsPane.append(empty);
    requestsContent?.append(playlistsPane);
  }

  function bindSavedPlaylistEditTriggers(root) {
    if (!root?.querySelectorAll || typeof window.showPlaylistEditPopup !== "function") return;

    root
      .querySelectorAll("#saved_playlists_accordion .djep-playlistlimits")
      .forEach((node) => {
        ensureSavedPlaylistEditControl(node);
      });
  }

  function bindSavedPlaylistScrollProxy(root) {
    bindAccordionScrollProxy(root, {
      accordionSelector: "#saved_playlists_accordion",
      bindingFlag: "djepSavedPlaylistScrollBound",
    });
  }

  function bindRequestsScrollProxy(root) {
    bindAccordionScrollProxy(root, {
      accordionSelector: "#requests_accordion",
      bindingFlag: "djepRequestsScrollBound",
      ignoreTargetSelector: ".djep-playlistlimits",
    });
  }

  function configureAccordionForClick(accordion, onActivate, normalizeAccordionWidths) {
    if (!(accordion instanceof HTMLElement) || !window.jQuery) return;

    const $accordion = jQuery(accordion);
    const activeIndex = Array.from(accordion.children).findIndex((node) => {
      return (
        node instanceof HTMLElement &&
        node.classList.contains("ui-accordion-header") &&
        (node.classList.contains("ui-state-active") || node.classList.contains("ui-accordion-header-active"))
      );
    });

    try {
      if ($accordion.hasClass("ui-accordion")) {
        $accordion.accordion("destroy");
      }
    } catch (error) {
      // Ignore stale accordion instances from the native page.
    }

    $accordion
      .show()
      .accordion({
        event: "click",
        autoHeight: false,
        collapsible: true,
        active: activeIndex >= 0 ? activeIndex / 2 : 0,
      })
      .off("accordionchange.djep accordionactivate.djep")
      .on("accordionchange.djep accordionactivate.djep", () => {
        if (typeof normalizeAccordionWidths === "function") {
          normalizeAccordionWidths(accordion);
        }
        if (typeof onActivate === "function") onActivate();
      });

    if (typeof normalizeAccordionWidths === "function") {
      normalizeAccordionWidths(accordion);
    }
  }

  function initMusicPage() {
    const content = document.getElementById("djep-content");
    const form = document.querySelector('form[name="ep_form"][action*="browsemusic.asp"]');
    const heading = form?.querySelector(":scope > h2.djep-h2");
    const musicBox = form?.querySelector(":scope > .djep-selectyourmusicbox, :scope > .djep-music-panel");
    const layoutTable = musicBox?.querySelector(":scope > .djep-selectmusictable");
    if (!content || !form || !heading || !musicBox || !layoutTable) return;
    const musicAlreadyBuilt =
      form.dataset.djepMusicInit === "1" &&
      heading.querySelector(".djep-music-title") &&
      musicBox.querySelector(".djep-music-browser-head") &&
      musicBox.querySelector(".djep-music-requests-head");
    form.dataset.djepMusicInit = "1";

    document.body.classList.add("djep-musicpage-ready");
    musicBox.classList.remove("djep-selectyourmusicbox");
    musicBox.classList.add("djep-music-panel");

    installMusicPlaylistDeletePatch(form);
    installMusicPlaylistModalPatch(form);

    decorateMusicRows(musicBox);

    normalizeMusicPageHeading(heading);

    const planningNavButton = heading.querySelector(".djep-music-header-button");
    bindMusicPlanningNavButton(planningNavButton);

    const tableRow = layoutTable.querySelector(":scope > tbody > tr");
    const browserCell = tableRow?.children[0];
    const requestsCell = tableRow?.children[1];
    const tabs = musicBox.querySelector("#tabs");
    const tabsNav = tabs?.querySelector("#tabs_hider_helper") || tabs?.querySelector(".ui-tabs-nav");
    const requestsTitle = requestsCell?.querySelector(".djep-requestonlytitle");
    const requestsContent = requestsCell?.querySelector("#your_requests_content") || requestsCell;
    const requestsAccordion = requestsCell?.querySelector("#requests_accordion");
    const requestLimitBox = requestsCell?.querySelector(".djep-requestlimitbox");
    const successBanner = musicBox.querySelector("#alert_message_div");

    const refreshMusicRequestMobilePresentation = createMusicRequestMobilePresentationRefresher({
      requestsContent,
      requestsAccordion,
    });
    const refreshMusicMobileLayout = () =>
      normalizeMusicMobileLayout({
        heading,
        musicBox,
        browserCell,
        requestsCell,
        tabs,
        requestsContent,
      });
    const refreshMusicEmptyStatesForPage = () => refreshMusicEmptyStates(requestsAccordion);
    const normalizeMusicRequestHeadersForPage = (root = requestsCell, options = {}) =>
      normalizeMusicRequestHeaders(root, options);
    const enhanceMusicDropTargetsForPage = () => enhanceMusicDropTargets(requestsCell);

    let queueMusicRequestMetaSync = null;
    let refreshMusicRequestViews = null;
    function setMusicRequestView(view) {
      setMusicRequestViewState(requestsContent, view, queueMusicRequestMetaSync, refreshMusicRequestMobilePresentation);
    }

    queueMusicRequestMetaSync = createQueuedMusicRequestMetaSync(musicBox, () => {
      syncMusicRequestMeta({ requestsContent, requestsCell, requestsAccordion, requestLimitBox });
    });

    refreshMusicRequestViews = createMusicRequestViewsRefresher({
      requestsContent,
      requestsAccordion,
      requestsCell,
      setMusicRequestView,
      queueMusicRequestMetaSync,
      refreshMusicRequestMobilePresentation,
      refreshMusicEmptyStates: refreshMusicEmptyStatesForPage,
      normalizeMusicAccordionWidths,
    });

    if (musicAlreadyBuilt) {
      refreshExistingMusicShell({
        musicBox,
        requestLimitBox,
        normalizeMusicRequestHeaders: normalizeMusicRequestHeadersForPage,
        normalizeMusicPlaylistRows,
        requestsCell,
        refreshMusicEmptyStates: refreshMusicEmptyStatesForPage,
        refreshMusicRequestViews,
        queueMusicRequestMetaSync,
        normalizeMusicMobileLayout: refreshMusicMobileLayout,
        refreshMusicRequestMobilePresentation,
        enhanceMusicDropTargets: enhanceMusicDropTargetsForPage,
        form,
        tabs,
        requestsContent,
      });
      return;
    }

    buildMusicShell({
      browserCell,
      requestsCell,
      tabs,
      requestsAccordion,
      requestLimitBox,
      successBanner,
      requestsTitle,
    });

    refreshMusicMobileLayout();
    installMusicBrowseEnhancements({
      form,
      tabs,
      musicBox,
      requestsContent,
      requestsCell,
      normalizeMusicRequestHeaders: normalizeMusicRequestHeadersForPage,
      refreshMusicEmptyStates: refreshMusicEmptyStatesForPage,
      enhanceMusicDropTargets: enhanceMusicDropTargetsForPage,
    });

    initializeMusicSpotifyAndTabs({
      tabs,
      tabsNav,
      requestsContent,
    });

    bindMusicMaintenanceObserver({
      musicBox,
      decorateMusicRows,
      normalizeMusicRequestHeaders: normalizeMusicRequestHeadersForPage,
      normalizeMusicPlaylistRows,
      refreshMusicEmptyStates: refreshMusicEmptyStatesForPage,
      refreshMusicRequestViews,
      normalizeMusicMobileLayout: refreshMusicMobileLayout,
      refreshMusicRequestMobilePresentation,
      requestsCell,
    });

    bindMusicRequestMetaObserver(requestsCell, queueMusicRequestMetaSync);

    if (requestLimitBox) {
      requestLimitBox.remove();
    }

    finalizeMusicPageSetup({
      requestsContent,
      requestsCell,
      requestsAccordion,
      requestLimitBox,
      queueMusicRequestMetaSync,
      refreshMusicEmptyStates: refreshMusicEmptyStatesForPage,
      refreshMusicRequestViews,
    });

    isolateMusicHelperInfrastructure({
      form,
      musicBox,
      layoutTable,
      heading,
    });

    musicBox.querySelectorAll(':scope > .cf, :scope > br').forEach((node) => node.remove());
    musicBox.querySelectorAll(':scope > div[style*="height:20px"], :scope > div[style*="height:0px"]').forEach((node) => {
      if (!cleanText(node.textContent || "") && node.children.length === 0) {
        node.remove();
      }
    });

    content.replaceChildren(heading, form);
  }

  // ---------------------------------------------------------------------------
  // Request page modules
  // ---------------------------------------------------------------------------

  function buildGuestRequestsWorkspace({
    descriptionBox,
    howBox,
    settingsBox,
    requestBox,
    eventDate,
  }) {
    const guestLinkText = cleanText(
      howBox.querySelector("#guest_request_link_id_value")?.value ||
      howBox.querySelector(".djep-guestrequestpassword")?.textContent ||
      ""
    );
    const guestPassword = cleanText(
      howBox.querySelector("#guest_request_password_id_value")?.value ||
      Array.from(howBox.querySelectorAll(".djep-guestrequestpassword"))[1]?.textContent ||
      ""
    );
    const copyLinkButton = howBox.querySelector("#guest_request_link_id");
    const copyPasswordButton = howBox.querySelector("#guest_request_password_id");
    const notifyCheckbox = settingsBox.querySelector("#enable_notifications_checkbox");
    const notifyLabel = settingsBox.querySelector("#djep-enable_notifications_checkbox_label");

    const workspace = document.createElement("div");
    workspace.className = "djep-guestrequests-workspace";

    const overviewHeader = document.createElement("section");
    overviewHeader.className = "djep-guestrequests-hero";
    overviewHeader.innerHTML =
      '<div class="djep-guestrequests-card-label">Access</div>' +
      '<div class="djep-guestrequests-hero-title">Share With Guests</div>' +
      '<p class="djep-guestrequests-copy">Share the request link, event date, and password so guests can submit songs before the event.</p>';

    const accessGrid = document.createElement("div");
    accessGrid.className = "djep-guestrequests-access-grid";
    accessGrid.append(
      buildGuestRequestsInfoRow("Guest Request Link", guestLinkText, copyLinkButton, "djep-guestrequests-info-row-link"),
      buildGuestRequestsInfoRow("Event Date", eventDate, null),
      buildGuestRequestsInfoRow("Password", guestPassword, copyPasswordButton)
    );
    overviewHeader.append(accessGrid);

    const requestsCard = document.createElement("section");
    requestsCard.className = "djep-guestrequests-card djep-guestrequests-list-card";

    const requestTitle = cleanText(
      requestBox.querySelector(".djep-titlebar")?.textContent || "Requests Made By Your Guests So Far"
    );
    const requestHeader = document.createElement("div");
    requestHeader.className = "djep-guestrequests-card-heading";
    requestHeader.innerHTML =
      '<div class="djep-guestrequests-heading-main">' +
      '<div class="djep-guestrequests-card-label">Requests</div>' +
      `<div class="djep-guestrequests-card-title">${requestTitle}</div>` +
      '<p class="djep-guestrequests-copy">Review the requests your guests have already submitted.</p>' +
      "</div>";

    if (notifyLabel && notifyCheckbox) {
      const toggleWrap = document.createElement("label");
      toggleWrap.className = "djep-guestrequests-toggle djep-guestrequests-header-toggle";
      toggleWrap.append(notifyCheckbox);

      const toggleBody = document.createElement("span");
      toggleBody.className = "djep-guestrequests-toggle-body";
      toggleBody.innerHTML = '<span class="djep-guestrequests-toggle-title">Email Notifications</span>';

      const toggleSwitch = document.createElement("span");
      toggleSwitch.className = "djep-guestrequests-toggle-switch";

      toggleWrap.append(toggleBody, toggleSwitch);
      requestHeader.append(toggleWrap);
    }

    const requestRows = Array.from(requestBox.querySelectorAll("table tr"));
    const requestList = document.createElement("div");
    requestList.className = "djep-guestrequests-list";
    const builtRows = requestRows.map(buildGuestRequestItem).filter(Boolean);
    if (builtRows.length) {
      builtRows.forEach((row) => requestList.append(row));
    } else {
      const empty = document.createElement("div");
      empty.className = "djep-guestrequests-empty";
      empty.innerHTML =
        '<div class="djep-guestrequests-empty-title">No guest requests yet</div>' +
        "<p>Once guests start submitting songs, they will appear here automatically.</p>";
      requestList.append(empty);
    }

    requestsCard.append(requestHeader, requestList);
    workspace.append(overviewHeader, requestsCard);
    return workspace;
  }

  function buildGuestRequestsEventDate(metaSource) {
    const metaValue = (name) =>
      cleanText(metaSource?.querySelector(`[data-name="${name}"]`)?.getAttribute("data-content") || "");
    const eventMonth = metaValue("ext-month");
    const eventDay = metaValue("ext-day");
    const eventYear = metaValue("ext-year");
    return [eventMonth, eventDay, eventYear].filter(Boolean).join("/");
  }

  function cleanupGuestRequestsRoot(content, backButton, removableNodes) {
    removableNodes.forEach((node) => {
      if (node) node.remove();
    });

    content.querySelectorAll(':scope > br, :scope > .cf, :scope > div[align="center"]').forEach((node) => {
      if (!node.contains(backButton)) {
        node.remove();
      }
    });
  }

  function ensureSongRequestsMobileRuntimeStyles() {
    upsertRuntimeStyle(
      "djep-songrequests-mobile-runtime",
      `
@media (max-width: 767px) {
  body.djep-songrequestspage-ready .djep-songrequests-empty-state {
    display: grid !important;
    gap: 14px !important;
    padding: 22px 20px !important;
    border: 1px solid #dbe3ef !important;
    border-radius: 24px !important;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98)) !important;
    box-shadow: 0 14px 28px rgba(17, 26, 46, 0.05) !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-state[hidden] {
    display: none !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-eyebrow {
    color: #667085 !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    letter-spacing: 0.1em !important;
    text-transform: uppercase !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-title {
    color: #101729 !important;
    font-size: 21px !important;
    font-weight: 800 !important;
    line-height: 1.25 !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-copy,
  body.djep-songrequestspage-ready .djep-songrequests-empty-note {
    color: #667085 !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    line-height: 1.65 !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-actions {
    display: grid !important;
    gap: 10px !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-action {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 46px !important;
    padding: 0 16px !important;
    border-radius: 14px !important;
    text-decoration: none !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-action--primary {
    border: 1px solid transparent !important;
    background: linear-gradient(135deg, #b3298a, #d63f99) !important;
    color: #ffffff !important;
    box-shadow: 0 10px 20px rgba(179, 41, 138, 0.2) !important;
  }

  body.djep-songrequestspage-ready .djep-songrequests-empty-action--secondary {
    border: 1px solid rgba(216, 223, 235, 0.96) !important;
    background: #ffffff !important;
    color: #344054 !important;
    box-shadow: 0 6px 14px rgba(17, 26, 46, 0.05) !important;
  }
}
      `.trim()
    );
  }

  function ensureSongRequestsEmptyState(form, backButton) {
    if (!(form instanceof HTMLElement) || !isMobileViewport()) return null;

    ensureSongRequestsMobileRuntimeStyles();

    const eventId = getCurrentEventId();
    const planHref = normalizeShellHref(
      backButton?.getAttribute("href") ||
      (eventId ? `/clients/planmyevent.asp?eventid=${encodeURIComponent(eventId)}` : "/clients/planmyevent.asp")
    );
    const musicHref = normalizeShellHref(
      eventId ? `/clients/music.asp?eventid=${encodeURIComponent(eventId)}` : "/clients/music.asp"
    );

    let emptyState = form.querySelector(".djep-songrequests-empty-state");
    if (!emptyState) {
      emptyState = document.createElement("section");
      emptyState.className = "djep-songrequests-empty-state";
      emptyState.innerHTML = `
        <div class="djep-songrequests-empty-eyebrow">Nothing Here Yet</div>
        <div class="djep-songrequests-empty-title">Song requests will show up here once they have been added.</div>
        <div class="djep-songrequests-empty-copy">If you are using this page for must-play planning, start in Music and add the songs there first. Once requests exist, you can review and edit them from this page on mobile.</div>
        <div class="djep-songrequests-empty-actions">
          <a class="djep-songrequests-empty-action djep-songrequests-empty-action--primary" href="${musicHref}">Open Music</a>
          <a class="djep-songrequests-empty-action djep-songrequests-empty-action--secondary" href="${planHref}">Back to Planning</a>
        </div>
        <div class="djep-songrequests-empty-note">This keeps the mobile page complete even when DJEP returns an empty song request form.</div>
      `.trim();
      form.insertBefore(emptyState, form.firstChild || null);
    }

    return emptyState;
  }

  function buildSongRequestsWorkspace(requestBoxes) {
    const workspace = document.createElement("div");
    workspace.className = "djep-songrequests-workspace";

    const activeGroup = document.createElement("div");
    activeGroup.className = "djep-songrequests-active";

    const emptyGroup = document.createElement("section");
    emptyGroup.className = "djep-songrequests-empty-group";

    const emptyGroupLabel = document.createElement("div");
    emptyGroupLabel.className = "djep-songrequests-group-label";
    emptyGroupLabel.textContent = "No Requests Yet";

    const emptyGrid = document.createElement("div");
    emptyGrid.className = "djep-songrequests-empty-grid";

    requestBoxes.forEach((box) => {
      const { card, hasSongs } = buildSongRequestCard(box);
      if (hasSongs) {
        activeGroup.append(card);
      } else {
        emptyGrid.append(card);
      }
    });

    if (activeGroup.children.length) {
      workspace.append(activeGroup);
    }

    if (emptyGrid.children.length) {
      emptyGroup.append(emptyGroupLabel, emptyGrid);
      workspace.append(emptyGroup);
    }

    return workspace;
  }

  function mountSongRequestsWorkspace(form, requestBoxes, workspace, backButton) {
    const insertBeforeNode = requestBoxes.find((box) => form.contains(box)) || null;
    if (workspace.children.length) {
      form.insertBefore(workspace, insertBeforeNode);
    } else {
      ensureSongRequestsEmptyState(form, backButton);
    }
  }

  function cleanupSongRequestsRoot(form, requestBoxes, backButton) {
    requestBoxes.forEach((box) => box.remove());

    form
      .querySelectorAll(':scope > .cf, :scope > br, :scope > div[style*="height:10px"], :scope > div[style*="height:0px"]')
      .forEach((node) => node.remove());

    form.querySelectorAll(':scope > .djep-readviewbutton').forEach((node) => {
      if (node !== backButton) node.remove();
    });
  }

  function normalizeEventDetailsHeading(pageHeading) {
    if (!(pageHeading instanceof HTMLElement) || !pageHeading.matches("h2.djep-h2")) return null;

    pageHeading.classList.add("djep-eventdetails-heading");

    const planEventButton = pageHeading.querySelector(".djep-planeventbutton");
    if (planEventButton && !planEventButton.dataset.djepLabelNormalized) {
      planEventButton.dataset.djepLabelNormalized = "1";
      planEventButton.textContent = "Plan My Event";
    }

    return pageHeading;
  }

  function mountEventDetailsHeadingMeta(pageHeading, { eventDateValue, eventTypeValue, bookingStatusValue, eventIdValue, venueName }) {
    if (!(pageHeading instanceof HTMLElement)) return;

    if (!pageHeading.querySelector(".djep-eventdetails-meta")) {
      const metaItems = [
        ["Date", eventDateValue],
        ["Type", eventTypeValue],
        ["Status", bookingStatusValue],
        ["Event ID", eventIdValue]
      ].filter(([, value]) => value);

      if (metaItems.length) {
        pageHeading.append(buildEventDetailsMetaItems(metaItems));
      }
    }

    if (!pageHeading.querySelector(".djep-eventdetails-subtitle")) {
      const subtitle = buildEventDetailsSubtitle(eventTypeValue, venueName, eventDateValue);
      if (subtitle) {
        pageHeading.append(subtitle);
      }
    }
  }

  function simplifyEventDetailsRequestCopy(requestChangesBox) {
    const requestCopy = requestChangesBox?.querySelector(".djep_innerboxtext p:first-child");
    if (requestCopy && !requestCopy.dataset.djepSimplified) {
      requestCopy.dataset.djepSimplified = "1";
      requestCopy.textContent =
        "Need to update anything above? Send a change request and we will revise the event details.";
    }
  }

  function pruneEmptyRelatedFilesBox(relatedFilesBox) {
    if (!relatedFilesBox) return;
    const hasRealFile = Array.from(relatedFilesBox.querySelectorAll("td")).some((cell) => {
      return (cell.textContent || "").replace(/\s+/g, "").length > 0;
    });

    if (!hasRealFile) {
      relatedFilesBox.remove();
    }
  }

  function cleanupEventDetailsSources({
    eventDescriptionBox,
    paymentHistoryBox,
    financeSummaryBox,
    serviceDetailsBox,
    relatedFilesBox,
  }) {
    eventDescriptionBox?.remove();
    paymentHistoryBox?.remove();
    financeSummaryBox?.remove();
    pruneEmptyRelatedFilesBox(relatedFilesBox);
    serviceDetailsBox?.remove();
  }

  function buildEventDetailsMetaItems(metaItems) {
    const meta = document.createElement("div");
    meta.className = "djep-eventdetails-meta";

    metaItems.forEach(([label, value]) => {
      const item = document.createElement("span");
      item.className = "djep-eventdetails-meta-item";

      const itemLabel = document.createElement("span");
      itemLabel.className = "djep-eventdetails-meta-label";
      itemLabel.textContent = label;

      const itemValue = document.createElement("span");
      itemValue.className = "djep-eventdetails-meta-value";
      itemValue.textContent = value;

      item.append(itemLabel, itemValue);
      meta.append(item);
    });

    return meta;
  }

  function buildEventDetailsSubtitle(eventTypeValue, venueName, eventDateValue) {
    const subtitleParts = [
      eventTypeValue,
      venueName ? `at ${venueName}` : "",
      eventDateValue ? `on ${eventDateValue}` : ""
    ].filter(Boolean);

    if (!subtitleParts.length) return null;

    const subtitle = document.createElement("div");
    subtitle.className = "djep-eventdetails-subtitle";
    subtitle.textContent = subtitleParts.join(" ");
    return subtitle;
  }

  function simplifyEventDetailsVenueBox(venueBox) {
    if (!venueBox) return;

    const venueTableCell = venueBox.querySelector("table td");
    if (venueTableCell && !venueTableCell.querySelector(".djep-venue-stack")) {
      const lines = venueTableCell.innerHTML
        .split(/<br\s*\/?>/i)
        .map((line) => line.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);

      if (lines.length) {
        const stack = document.createElement("div");
        stack.className = "djep-venue-stack";

        lines.forEach((line, index) => {
          const row = document.createElement("div");
          row.className = index === 0 ? "djep-venue-name" : "djep-venue-line";
          row.textContent = line;
          stack.appendChild(row);
        });

        venueTableCell.innerHTML = "";
        venueTableCell.appendChild(stack);
      }
    }

    const venueTable = venueBox.querySelector("table");
    const venueStack = venueBox.querySelector(".djep-venue-stack");
    if (venueTable && venueStack && !venueBox.querySelector(":scope > .djep-venue-stack")) {
      venueTable.remove();
      venueBox.appendChild(venueStack);
    }
  }

  function buildEventDetailsStaffList(staffingBox) {
    if (!staffingBox || staffingBox.querySelector(".djep-staff-list")) return;

    const title = staffingBox.querySelector(".djep-titlebarsmall");
    const sourceRows = Array.from(staffingBox.querySelectorAll("#djep-event_employee_table tr"));
    if (!title || !sourceRows.length) return;

    const staffList = document.createElement("div");
    staffList.className = "djep-staff-list";

    sourceRows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;

      const card = document.createElement("article");
      card.className = "djep-staff-member";

      const avatar = document.createElement("div");
      avatar.className = "djep-staff-member-avatar";
      const avatarImage = cells[0].querySelector("img");
      if (avatarImage) {
        avatar.append(avatarImage.cloneNode(true));
      } else {
        avatar.innerHTML = cells[0].innerHTML;
      }

      const body = document.createElement("div");
      body.className = "djep-staff-member-body";

      const name = document.createElement("div");
      name.className = "djep-staff-member-name";
      const role = cells[1].querySelector(".djep-staff-role");
      const nameText = Array.from(cells[1].childNodes)
        .filter((node) => !(node.nodeType === 1 && node.classList?.contains("djep-staff-role")))
        .map((node) => node.textContent || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      name.textContent = nameText;
      body.append(name);

      if (role) {
        body.append(role.cloneNode(true));
      }

      card.append(avatar, body);
      staffList.append(card);
    });

    Array.from(staffingBox.children).forEach((child) => {
      if (child !== title) {
        child.remove();
      }
    });

    staffingBox.append(staffList);
  }

  function readEventDetailsTableValue(box, labelText) {
    if (!box) return "";

    const normalizedLabel = labelText.toLowerCase();
    for (const row of box.querySelectorAll("tr")) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;

      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (label === normalizedLabel) {
        return (cells[1].textContent || "").replace(/\s+/g, " ").trim();
      }
    }

    return "";
  }

  function pruneEmptyEventDetailsRows(...boxes) {
    boxes.forEach((box) => {
      box?.querySelectorAll("tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 2) return;

        const value = (cells[1].textContent || "").replace(/\s+/g, " ").trim();
        if (!value) {
          row.remove();
        }
      });
    });
  }

  function normalizeEventDetailsFeeRows(root) {
    root.querySelectorAll(".djep-feedetailsbox tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;

      const leftText = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      const rightText = (cells[1].textContent || "").replace(/\s+/g, " ").trim();

      if (leftText.toLowerCase() === "description" && rightText.toLowerCase() === "price") {
        row.remove();
        return;
      }

      if (row.querySelector("b") && !rightText) {
        row.classList.add("djep-fee-section-row");
      }

      if (leftText && rightText && !row.classList.contains("djep-fee-section-row")) {
        row.classList.add("djep-fee-line-row");
      }
    });
  }

  function normalizeEventDetailsTotalRows(root) {
    root.querySelectorAll(".djep-totalfeebox tr").forEach((row) => {
      const labelCell = row.querySelector("td:first-child");
      if (!labelCell) return;

      const label = (labelCell.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      if (label === "subtotal:" || label === "retainer:") {
        row.remove();
        return;
      }

      if (label.indexOf("total fee") > -1) {
        row.classList.add("djep-total-row");
      }

      if (label.indexOf("payments") > -1) {
        row.classList.add("djep-payments-row");
      }

      if (label.indexOf("balance due") > -1) {
        row.classList.add("djep-balance-row");
        const valueCell = row.querySelector("td:last-child");
        if (valueCell && /\$0(?:\.00)?/.test((valueCell.textContent || "").trim())) {
          row.classList.add("is-paid");
        }
      }
    });
  }

  function normalizeEventDetailsStaffRows(staffingBox) {
    staffingBox?.querySelectorAll("#djep-event_employee_table tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 3 || row.dataset.djepMergedRole) return;

      const nameCell = cells[1];
      const roleCell = cells[2];
      const roleText = (roleCell.textContent || "").replace(/\s+/g, " ").trim();

      if (nameCell && roleText) {
        const label = document.createElement("span");
        label.className = "djep-staff-role";
        label.textContent = roleText.replace(/^\-\s*/, "");
        nameCell.append(label);
        roleCell.remove();
        row.dataset.djepMergedRole = "1";
      }
    });

    staffingBox?.querySelector("#djep-attirerow")?.remove();
  }

  function buildEventDetailsWorkspace({
    root,
    eventDateBox,
    venueBox,
    staffingBox,
    requestChangesBox,
    feeDetailsBox,
    totalsBox,
    paymentButton,
    documentsBox,
  }) {
    if (!(root instanceof HTMLElement) || root.querySelector(".djep-eventdetails-workspace")) return;

    const workspace = document.createElement("div");
    workspace.className = "col-xs-12 djep-eventdetails-workspace";

    const mainColumn = document.createElement("div");
    mainColumn.className = "djep-eventdetails-column djep-eventdetails-column-main";

    const sideColumn = document.createElement("div");
    sideColumn.className = "djep-eventdetails-column djep-eventdetails-column-side";

    const detailsPanel = document.createElement("div");
    detailsPanel.className = "col-xs-12 djep-eventdetails-overview-layout djep-panel-section djep-panel-details";

    const snapshotCard = document.createElement("div");
    snapshotCard.className = "djep-eventdetails-snapshot-card";

    if (eventDateBox) {
      eventDateBox.classList.add("djep-eventdetails-subcard", "djep-card-info", "djep-eventdetails-card-date");
      snapshotCard.append(eventDateBox);
    }

    if (venueBox) {
      venueBox.classList.add(
        "djep-eventdetails-subcard",
        "djep-card-info",
        "djep-card-venue",
        "djep-eventdetails-card-venue"
      );
      snapshotCard.append(venueBox);
    }

    detailsPanel.append(snapshotCard);

    if (staffingBox) {
      staffingBox.classList.add(
        "djep-card-staff",
        "djep-subsection-card",
        "djep-subsection-team",
        "djep-eventdetails-card-staff"
      );
      detailsPanel.append(staffingBox);
    }

    if (requestChangesBox) {
      requestChangesBox.classList.add(
        "djep-card-action",
        "djep-subsection-card",
        "djep-subsection-updates",
        "djep-eventdetails-card-updates"
      );
      detailsPanel.append(requestChangesBox);
    }

    const financialLayout = document.createElement("div");
    financialLayout.className = "col-xs-12 djep-eventdetails-financial-layout djep-panel-section djep-panel-financials";

    const financialMain = document.createElement("div");
    financialMain.className = "djep-eventdetails-financial-main";

    if (feeDetailsBox) {
      feeDetailsBox.classList.add("djep-card-pricing", "djep-eventdetails-card-pricing");
      financialMain.append(feeDetailsBox);
    }

    if (totalsBox) {
      totalsBox.classList.add("djep-card-totals", "djep-eventdetails-card-totals");
      financialMain.append(totalsBox);
    }

    financialLayout.append(financialMain);

    if (paymentButton) {
      const financialActions = document.createElement("div");
      financialActions.className = "djep-financial-actions";
      financialActions.append(paymentButton);
      financialLayout.append(financialActions);
    }

    mainColumn.append(detailsPanel);
    sideColumn.append(financialLayout);
    workspace.append(mainColumn, sideColumn);

    root.append(workspace);

    if (documentsBox) {
      documentsBox.classList.add(
        "djep-card-documents",
        "djep-panel-section",
        "djep-panel-documents",
        "djep-eventdetails-card-documents"
      );
      root.append(documentsBox);
    }
  }

  function finalizeEventDetailsCleanClasses({
    eventDateBox,
    venueBox,
    feeDetailsBox,
    totalsBox,
    staffingBox,
    requestChangesBox,
    documentsBox,
  }) {
    [
      [eventDateBox, "djep-eventdatetimesbox"],
      [venueBox, "djep-venueinfobox"],
      [feeDetailsBox, "djep-feedetailsbox"],
      [totalsBox, "djep-totalfeebox"],
      [staffingBox, "djep-staffingbox"],
      [requestChangesBox, "djep-requestchangesbox"],
      [documentsBox, "djep-documentsbox"],
    ].forEach(([node, legacyClassName]) => {
      if (!(node instanceof HTMLElement)) return;
      node.classList.remove(legacyClassName);
    });
  }

  function cleanupEventDetailsRoot(root, documentsBox) {
    if (!(root instanceof HTMLElement)) return;

    root.querySelectorAll(".djep-paymentbutton").forEach((button) => {
      if (button.dataset.djepLabelNormalized) return;
      button.dataset.djepLabelNormalized = "1";
      button.textContent = "Make a Payment";
    });

    root.querySelectorAll(".djep-actionbutton").forEach((button) => {
      if (button.dataset.djepLabelNormalized) return;
      button.dataset.djepLabelNormalized = "1";
      button.textContent = "Request Changes";
    });

    root.querySelectorAll("[onmouseover], [onmouseout]").forEach((node) => {
      node.removeAttribute("onmouseover");
      node.removeAttribute("onmouseout");
    });

    root
      .querySelectorAll(".djep-tablehover, .djep-tablehover1, .djep-tablehover2, .djep-cursorpointer")
      .forEach((node) => {
        node.classList.remove("djep-tablehover", "djep-tablehover1", "djep-tablehover2", "djep-cursorpointer");
      });

    Array.from(root.children).forEach((child) => {
      if (child === root.querySelector(".djep-eventdetails-workspace")) return;
      if (child === documentsBox) return;
      if (child.id === "eventid") return;

      if (
        child.querySelector &&
        child.querySelector(
          ".djep-eventdetails-workspace, .djep-eventdatetimesbox, .djep-eventdescriptionbox, .djep-servicedetailsbox, .djep-venueinfobox, .djep-feedetailsbox, .djep-totalfeebox, .djep-staffingbox, .djep-paymentsfinancesbox, .djep-paymenthistorybox, .djep-documentsbox, .djep-relatedfilesbox, .djep-requestchangesbox"
        )
      ) {
        child.remove();
        return;
      }

      if (child.tagName === "DIV" && (child.textContent || "").replace(/\s+/g, "").length === 0) {
        child.remove();
      }
    });

    Array.from(root.children).forEach((child) => {
      if (child === root.querySelector(".djep-eventdetails-workspace")) return;
      if (child === documentsBox) return;
      if (child.id === "eventid") return;
      if ((child.textContent || "").replace(/\s+/g, "").length > 0) return;
      if (child.children.length > 0) return;
      child.remove();
    });
  }

  function ensureMusicRequestEmptyState(requestFrame, rowCount) {
    if (!(requestFrame instanceof HTMLElement)) return;
    let emptyState = requestFrame.querySelector(".djep-music-request-empty");
    if (rowCount === 0) {
      requestFrame.classList.add("djep-music-request-is-empty");
      requestFrame.classList.remove("djep-music-request-has-songs");
      if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.className = "djep-music-request-empty";
        emptyState.innerHTML = "<strong>No songs added yet.</strong><span>Drag tracks here from the library or use Add Your Own.</span>";
        requestFrame.append(emptyState);
      }
      return;
    }

    requestFrame.classList.add("djep-music-request-has-songs");
    requestFrame.classList.remove("djep-music-request-is-empty");
    emptyState?.remove();
  }

  function setMusicRequestViewState(requestsContent, view, queueMusicRequestMetaSync, refreshMusicRequestMobilePresentation) {
    if (!(requestsContent instanceof HTMLElement)) return;
    const nextView = view === "playlists" ? "playlists" : "requests";
    requestsContent.dataset.djepMusicRequestView = nextView;

    requestsContent
      .querySelectorAll(":scope > .djep-music-request-switcher .djep-music-request-switch")
      .forEach((button) => {
        const active = button.dataset.view === nextView;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });

    const requestsBlock = requestsContent.querySelector(":scope > #requests_accordion");
    const playlistsBlock = requestsContent.querySelector(":scope > #saved_playlists_content");
    const playlistsEmptyBlock = requestsContent.querySelector(":scope > .djep-music-playlists-empty");
    const requestMetaFooter = requestsContent.querySelector(":scope > .djep-music-request-meta--footer");

    if (requestsBlock instanceof HTMLElement) {
      requestsBlock.hidden = nextView !== "requests";
      requestsBlock.style.display = nextView === "requests" ? "" : "none";
    }
    if (requestMetaFooter instanceof HTMLElement) {
      if (nextView === "requests") {
        requestMetaFooter.hidden = false;
        requestMetaFooter.removeAttribute("hidden");
        requestMetaFooter.style.display = "flex";
      } else {
        requestMetaFooter.hidden = true;
        requestMetaFooter.style.display = "none";
      }
    }
    if (playlistsBlock instanceof HTMLElement) {
      playlistsBlock.hidden = nextView !== "playlists";
      playlistsBlock.style.display = nextView === "playlists" ? "" : "none";
    }
    if (playlistsEmptyBlock instanceof HTMLElement) {
      playlistsEmptyBlock.hidden = nextView !== "playlists";
      playlistsEmptyBlock.style.display = nextView === "playlists" ? "" : "none";
    }

    if (nextView === "playlists" && playlistsBlock instanceof HTMLElement) {
      const refreshSavedPlaylistScrollers = () => {
        playlistsBlock
          .querySelectorAll("#saved_playlists_accordion > .ui-accordion-content [id^='request_table_div_']")
          .forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            node.style.overflowY = "hidden";
            void node.offsetHeight;
            node.style.overflowY = "auto";
            node.style.webkitOverflowScrolling = "touch";
            node.style.touchAction = "pan-y";
          });
      };

      refreshSavedPlaylistScrollers();
      window.requestAnimationFrame(refreshSavedPlaylistScrollers);
    }

    queueMusicRequestMetaSync();
    refreshMusicRequestMobilePresentation();
  }

  function ensureMusicRequestSwitcher(requestsContent, setMusicRequestView) {
    if (!(requestsContent instanceof HTMLElement)) return null;

    let switcher = requestsContent.querySelector(":scope > .djep-music-request-switcher");
    if (!switcher) {
      switcher = document.createElement("div");
      switcher.className = "djep-music-request-switcher";

      const requestsButton = document.createElement("button");
      requestsButton.type = "button";
      requestsButton.className = "djep-music-request-switch";
      requestsButton.dataset.view = "requests";
      requestsButton.textContent = "Requests";

      const playlistsButton = document.createElement("button");
      playlistsButton.type = "button";
      playlistsButton.className = "djep-music-request-switch";
      playlistsButton.dataset.view = "playlists";
      playlistsButton.textContent = "Spotify Playlists";

      switcher.append(requestsButton, playlistsButton);
      requestsContent.insertBefore(switcher, requestsContent.firstChild || null);
    }

    if (switcher.dataset.djepMusicSwitcherBound !== "1") {
      switcher.dataset.djepMusicSwitcherBound = "1";
      switcher.addEventListener("click", (event) => {
        const button = event.target.closest(".djep-music-request-switch");
        if (!button) return;
        setMusicRequestView(button.dataset.view || "requests");
      });
    }

    return switcher;
  }

  function installMusicPlaylistDeletePatch(form) {
    if (!(form instanceof HTMLElement) || form.dataset.djepPlaylistDeletePatch === "1") return;
    form.dataset.djepPlaylistDeletePatch = "1";

    const originalDeletePlaylistViaQuerystring =
      typeof window.jsDeletePlaylistViaQuerystring === "function" ? window.jsDeletePlaylistViaQuerystring : null;

    window.jsDeletePlaylistViaQuerystring = function jsDeletePlaylistViaQuerystringPatched() {
      const playlistIdField = document.querySelector("#edit_playlist_window #edit_playlist_window_playlistID");
      const playlistId = playlistIdField?.value || "";
      const eventId =
        document.forms.ep_form?.elements?.eventid?.value ||
        document.getElementById("upcomingeventid")?.textContent ||
        "";

      if (!playlistId || !eventId) {
        return originalDeletePlaylistViaQuerystring?.apply(this, arguments);
      }

      if (window.jQuery) {
        window.jQuery("#confirm_playlist_deletion_div").dialog?.("close");
        window.jQuery("#edit_playlist_window").dialog?.("close");
      }

      const deleteUrl = `songrequests.asp?eventid=${encodeURIComponent(eventId)}&action=delete_playlist&playlistid=${encodeURIComponent(playlistId)}`;
      const redirectUrl = `music.asp?eventid=${encodeURIComponent(eventId)}`;
      const completeRedirect = () => {
        window.location.href = redirectUrl;
      };

      if (window.jQuery?.ajax) {
        window.jQuery
          .ajax({
            url: deleteUrl,
            type: "GET",
            cache: false,
          })
          .always(completeRedirect);
        return;
      }

      if (window.fetch) {
        window.fetch(deleteUrl, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }).finally(completeRedirect);
        return;
      }

      completeRedirect();
    };
  }

  function installMusicPlaylistModalPatch(form) {
    if (!(form instanceof HTMLElement) || form.dataset.djepPlaylistModalPatch === "1") return;
    form.dataset.djepPlaylistModalPatch = "1";

    const originalShowPlaylistEditPopup =
      typeof window.showPlaylistEditPopup === "function" ? window.showPlaylistEditPopup : null;

    if (!(originalShowPlaylistEditPopup && window.jQuery)) return;

    window.showPlaylistEditPopup = function showPlaylistEditPopupPatched(passed_playlist_id, playlist_display_title) {
      const result = originalShowPlaylistEditPopup.apply(this, arguments);
      const dialog = window.jQuery("#edit_playlist_window");
      dialog.closest(".ui-dialog").addClass("djep-music-playlist-dialog");
      dialog.dialog?.("option", {
        width: 480,
        minWidth: 480,
        height: "auto",
      });
      return result;
    };
  }

  function decorateMusicRows(root) {
    if (!root?.querySelectorAll) return;

    root.querySelectorAll("tr[onmouseover], tr[onmouseout]").forEach((row) => {
      row.removeAttribute("onmouseover");
      row.removeAttribute("onmouseout");
    });

    root
      .querySelectorAll(".djep-tablehover, .djep-tablehover1, .djep-tablehover2, .djep-cursorpointer")
      .forEach((node) => {
        node.classList.remove("djep-tablehover", "djep-tablehover1", "djep-tablehover2", "djep-cursorpointer");
      });
  }

  function ensureSavedPlaylistEditControl(node) {
    if (!(node instanceof HTMLElement) || typeof window.showPlaylistEditPopup !== "function") return false;
    if (!node.closest("#saved_playlists_accordion")) return false;

    const rawOnclick = node.dataset.djepSavedPlaylistOnclick || node.getAttribute("onclick") || "";
    const match = rawOnclick.match(/showPlaylistEditPopup\('([^']+)','((?:\\'|[^'])*)'\)/);
    if (!match) return !!node.querySelector(".djep-music-playlist-edit");

    const playlistId = match[1];
    const playlistName = match[2].replace(/\\'/g, "'");

    node.dataset.djepSavedPlaylistOnclick = rawOnclick;
    node.dataset.djepSavedPlaylistId = playlistId;
    node.dataset.djepSavedPlaylistName = playlistName;
    node.removeAttribute("onclick");
    node.classList.remove("djep-music-limit-empty");

    let button = node.querySelector(".djep-music-playlist-edit");
    if (!(button instanceof HTMLButtonElement)) {
      node.textContent = "";
      button = document.createElement("button");
      button.type = "button";
      button.className = "djep-music-playlist-edit";
      button.innerHTML = "<span class=\"djep-music-playlist-edit-label\">Edit</span>";
      node.append(button);
    }

    button.setAttribute("aria-label", "Edit " + playlistName);
    if (button.dataset.djepSavedPlaylistEditBound !== "1") {
      button.dataset.djepSavedPlaylistEditBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.showPlaylistEditPopup(node.dataset.djepSavedPlaylistId || playlistId, node.dataset.djepSavedPlaylistName || playlistName);
      });
    }

    return true;
  }

  function normalizeMusicPlaylistRows(root) {
    if (!root?.querySelectorAll) return;

    root.querySelectorAll(".djep-playlist-listing tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;

      const artistCell = cells[0];
      const titleCell = cells[1];
      const onclick = row.getAttribute("onclick") || "";
      const match = onclick.match(/jsSetSongAndShowModalWindow\(\d+,'[^']*','((?:\\'|[^'])*)','((?:\\'|[^'])*)'/);

      let title = "";
      let artist = "";

      if (match) {
        title = match[1].replace(/\\'/g, "'");
        artist = match[2].replace(/\\'/g, "'");
        row.dataset.djepMusicSongTitle = title;
        row.dataset.djepMusicArtist = artist;
      } else {
        title = row.dataset.djepMusicSongTitle || cleanText(titleCell.textContent || "");
        artist = row.dataset.djepMusicArtist || cleanText(artistCell.textContent || "");
      }

      if (!artist || !title) return;

      row.classList.add("djep-music-playlist-row");
      artistCell.classList.add("djep-music-playlist-primary-cell");
      artistCell.colSpan = Math.max(Number(artistCell.colSpan) || 1, 2);
      if (titleCell.parentNode) {
        titleCell.parentNode.removeChild(titleCell);
      }

      let line = artistCell.querySelector(".djep-music-playlist-line");
      if (!line) {
        line = document.createElement("div");
        line.className = "djep-music-playlist-line";
        artistCell.textContent = "";
        artistCell.append(line);
      } else {
        line.textContent = "";
      }

      const titleSpan = document.createElement("span");
      titleSpan.className = "djep-music-playlist-song";
      titleSpan.textContent = title;

      const separator = document.createElement("span");
      separator.className = "djep-music-playlist-separator";
      separator.textContent = " - ";

      const artistSpan = document.createElement("span");
      artistSpan.className = "djep-music-playlist-artist";
      artistSpan.textContent = artist;

      line.append(titleSpan, separator, artistSpan);
    });
  }

  function bindAccordionScrollProxy(root, options = {}) {
    if (!(root instanceof HTMLElement)) return;
    const {
      accordionSelector,
      bindingFlag,
      ignoreTargetSelector = ".djep-playlistlimits, .djep-music-playlist-manage",
    } = options;
    if (!accordionSelector || !bindingFlag) return;
    if (root.dataset[bindingFlag] === "1") return;
    root.dataset[bindingFlag] = "1";

    const isVisibleElement = (node) => {
      return node instanceof HTMLElement && !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    };

    const configureScrollFrame = (panel) => {
      if (!(panel instanceof HTMLElement)) return null;
      const scrollFrame = panel.querySelector("[id^='request_table_div_']");
      if (!(scrollFrame instanceof HTMLElement)) return null;
      panel.style.overflow = "hidden";
      scrollFrame.style.overflowY = "auto";
      scrollFrame.style.overflowX = "hidden";
      scrollFrame.style.webkitOverflowScrolling = "touch";
      scrollFrame.style.overscrollBehavior = "contain";
      scrollFrame.style.scrollbarGutter = "stable";
      scrollFrame.style.touchAction = "pan-y";
      return scrollFrame;
    };

    root.querySelectorAll(`${accordionSelector} > .ui-accordion-content`).forEach((panel) => {
      configureScrollFrame(panel);
    });

    const getActiveScrollFrame = (target) => {
      const candidates = [];
      const pushCandidate = (node) => {
        if (!(node instanceof HTMLElement) || candidates.includes(node)) return;
        candidates.push(node);
      };

      if (target instanceof Element) {
        pushCandidate(target.closest("[id^='request_table_div_']"));
        pushCandidate(configureScrollFrame(target.closest(`${accordionSelector} > .ui-accordion-content`)));
      }

      root
        .querySelectorAll(`${accordionSelector} > .ui-accordion-content.ui-accordion-content-active`)
        .forEach((panel) => {
          pushCandidate(configureScrollFrame(panel));
        });

      root.querySelectorAll(`${accordionSelector} > .ui-accordion-content`).forEach((panel) => {
        const scrollFrame = configureScrollFrame(panel);
        if (isVisibleElement(scrollFrame)) {
          pushCandidate(scrollFrame);
        }
      });

      return (
        candidates.find((node) => isVisibleElement(node) && node.scrollHeight > node.clientHeight) ||
        candidates.find((node) => isVisibleElement(node)) ||
        null
      );
    };

    const scrollByDelta = (scrollFrame, delta) => {
      if (!(scrollFrame instanceof HTMLElement) || !Number.isFinite(delta) || delta === 0) return false;
      const maxScroll = scrollFrame.scrollHeight - scrollFrame.clientHeight;
      if (maxScroll <= 0) return false;
      const next = Math.max(0, Math.min(maxScroll, scrollFrame.scrollTop + delta));
      const changed = next !== scrollFrame.scrollTop;
      scrollFrame.scrollTop = next;
      return changed;
    };

    root.addEventListener(
      "wheel",
      (event) => {
        const target = event.target;
        if (target instanceof Element && ignoreTargetSelector && target.closest(ignoreTargetSelector)) {
          return;
        }
        const scrollFrame = getActiveScrollFrame(target);
        const changed = scrollByDelta(scrollFrame, event.deltaY);
        if (changed) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { passive: false, capture: true }
    );

    let touchStartY = null;
    root.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true, capture: true }
    );

    root.addEventListener(
      "touchmove",
      (event) => {
        if (touchStartY == null || event.touches.length !== 1) return;
        const scrollFrame = getActiveScrollFrame(event.target);
        const nextY = event.touches[0].clientY;
        const changed = scrollByDelta(scrollFrame, touchStartY - nextY);
        touchStartY = nextY;
        if (changed) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { passive: false, capture: true }
    );

    root.addEventListener(
      "touchend",
      () => {
        touchStartY = null;
      },
      { capture: true }
    );
  }

  function safeCloseDialog(selector) {
    if (!window.jQuery) return;
    const dialog = window.jQuery(selector);
    if (!dialog.length) return;
    const instance = dialog.data("uiDialog") || dialog.data("dialog");
    if (instance) {
      dialog.dialog("close");
    }
  }

  function installOfflineMusicMutationShim({
    requestsCell,
    normalizeMusicRequestHeaders,
    refreshMusicEmptyStates,
    enhanceMusicDropTargets,
  }) {
    const isOfflineMusicDemo = isLocalPreviewEnvironment();
    if (!isOfflineMusicDemo || window.__djepOfflineMusicShimInstalled) return;
    if (
      typeof window.AddSongRequestViaAjax !== "function" ||
      typeof window.jsUpdateSongRequestViaAjax !== "function" ||
      typeof window.jsDeleteSongViaAjax !== "function"
    ) {
      return;
    }

    const getNextLocalSongId = () => {
      const ids = Array.from(document.querySelectorAll("[id^='song_row_for_songid_']"))
        .map((row) => Number((row.id || "").replace("song_row_for_songid_", "")))
        .filter((value) => Number.isFinite(value));
      const maxId = ids.length ? Math.max(...ids, 50000) : 50000;
      return maxId + 1;
    };

    const isCountableRequestTable = (table) => {
      return (
        table instanceof HTMLTableElement &&
        !table.id.endsWith("_ALL") &&
        !table.closest("#saved_playlists_content") &&
        !table.closest("#saved_playlists_accordion")
      );
    };

    const safeRefreshMusicRequestStats = () => {
      const tables = Array.from(document.querySelectorAll("table[id^='request_table_']")).filter((table) => {
        return isCountableRequestTable(table);
      });
      let totalRequests = 0;

      tables.forEach((table) => {
        const requestType = table.id.replace("request_table_", "");
        const rowCount = table.querySelectorAll("tr").length;
        totalRequests += rowCount;
        const statNode = document.getElementById(`playlist_counter_span_${requestType}`);
        if (!statNode) return;

        let html = "";
        const typeLimit =
          typeof window.jsGetMaximumRequests === "function"
            ? Number(window.jsGetMaximumRequests(requestType))
            : 0;

        if (typeLimit > 0 && typeLimit < 9999) {
          html += `Limit: ${typeLimit}`;
        }
        if (rowCount > 0) {
          html += html ? `<br>Added: ${rowCount}` : `Added: ${rowCount}`;
        }
        statNode.innerHTML = html;
      });

      const overallLimitNode = document.getElementById("playlist_limit_span_ALL");
      const overallCountNode = document.getElementById("playlist_counter_span_ALL");
      const overallLimit =
        typeof window.jsGetMaximumRequests === "function"
          ? Number(window.jsGetMaximumRequests("ALL"))
          : 0;

      if (overallLimitNode && overallLimit > 0 && overallLimit < 9999) {
        overallLimitNode.textContent = `Overall Limit: ${overallLimit}`;
      }
      if (overallCountNode) {
        overallCountNode.textContent = totalRequests > 0 ? `Added So Far: ${totalRequests}` : "";
      }
    };

    const addOfflineMusicRequestRow = (songId, songTitle, artistName, requestType, comments) => {
      const requestTable = document.getElementById(`request_table_${requestType}`);
      if (!requestTable) return;

      const row = requestTable.insertRow(0);
      row.id = `song_row_for_songid_${songId}`;
      row.title = "Click To Edit";
      row.dataset.djepMusicSongTitle = songTitle;
      row.dataset.djepMusicArtist = artistName;
      row.setAttribute(
        "onclick",
        `jsSetSongAndShowModalWindow(${songId},'${requestType}','${songTitle.replace(/'/g, "\\'")}','${artistName.replace(/'/g, "\\'")}','${(comments || "").replace(/'/g, "\\'")}');`
      );

      const artistCell = row.insertCell(0);
      const titleCell = row.insertCell(1);
      artistCell.className = "djep-playlistboxtext";
      titleCell.className = "djep-playlistboxtext";
      artistCell.width = "45%";
      titleCell.width = "55%";
      artistCell.textContent = artistName;
      titleCell.textContent = songTitle;
    };

    const removeSongRow = (requestType, songId) => {
      const rowId = `song_row_for_songid_${songId}`;
      if (typeof window.deleteRow === "function") {
        window.deleteRow(`request_table_${requestType}`, rowId);
        return;
      }
      document.getElementById(rowId)?.remove();
    };

    const finalizeMusicMutation = () => {
      window.requestAnimationFrame(() => {
        safeRefreshMusicRequestStats();
        normalizeMusicRequestHeaders();
        normalizeMusicPlaylistRows(requestsCell);
        refreshMusicEmptyStates();
        enhanceMusicDropTargets();
      });
    };

    const originalAddSongRequestViaAjax = window.AddSongRequestViaAjax;
    const originalUpdateSongRequestViaAjax = window.jsUpdateSongRequestViaAjax;
    const originalDeleteSongViaAjax = window.jsDeleteSongViaAjax;

    window.AddSongRequestViaAjax = function AddSongRequestViaAjaxOffline(calling_function) {
      if (typeof window.jsOnGuestRequestPage === "function" && window.jsOnGuestRequestPage()) {
        return originalAddSongRequestViaAjax.call(this, calling_function);
      }

      const activePanel =
        typeof window.jsGetActiveSongPanel === "function" ? window.jsGetActiveSongPanel() : "";
      if (activePanel === "special songs") {
        const specialSongType =
          typeof window.jsGetSpecialSongTypeInModalWindow === "function"
            ? window.jsGetSpecialSongTypeInModalWindow()
            : "";
        const comments =
          typeof window.jsGetCommentsValueInModalWindow === "function"
            ? window.jsGetCommentsValueInModalWindow()
            : "";
        if (typeof window.jsUpdateSpecialSongInTable === "function") {
          window.jsUpdateSpecialSongInTable(
            specialSongType,
            typeof window.jsGetHiddenArtistName === "function" ? window.jsGetHiddenArtistName() : "",
            typeof window.jsGetHiddenSongTitle === "function" ? window.jsGetHiddenSongTitle() : "",
            comments
          );
        }
        safeCloseDialog("#edit_song_div");
        return;
      }

      let comments = "";
      let requestType = "";

      if (calling_function === "modal_window") {
        comments =
          typeof window.jsGetCommentsValueInModalWindow === "function"
            ? window.jsGetCommentsValueInModalWindow()
            : "";
        if (comments.length > 100) {
          if (typeof window.jsShowWarningModalWindow === "function") {
            window.jsShowWarningModalWindow(
              `You entered ${comments.length} characters in the comments field. Please reduce to 100 or less characters`
            );
          }
          return false;
        }
        requestType =
          typeof window.jsGetRequestTypeInModalWindow === "function"
            ? window.jsGetRequestTypeInModalWindow()
            : "";
      } else {
        requestType =
          typeof window.jsGetHiddenRequestType === "function" ? window.jsGetHiddenRequestType() : "";
      }

      if (
        typeof window.jsCheckIfUnderRequestTypeLimit === "function" &&
        !window.jsCheckIfUnderRequestTypeLimit(requestType)
      ) {
        if (typeof window.jsShowWarningModalWindow === "function") {
          window.jsShowWarningModalWindow(
            "You have reached the maximum number of requests for this request type. Please select another."
          );
        }
        return;
      }

      const songId = getNextLocalSongId();
      const songTitle =
        typeof window.jsGetHiddenSongTitle === "function" ? window.jsGetHiddenSongTitle() : "";
      const artistName =
        typeof window.jsGetHiddenArtistName === "function" ? window.jsGetHiddenArtistName() : "";

      addOfflineMusicRequestRow(songId, songTitle, artistName, requestType, comments);
      if (typeof window.jsShowSongAdded === "function") {
        window.jsShowSongAdded(requestType);
      }
      safeCloseDialog("#edit_song_div");
      finalizeMusicMutation();
    };

    window.jsUpdateSongRequestViaAjax = function jsUpdateSongRequestViaAjaxOffline() {
      if (typeof window.jsOnGuestRequestPage === "function" && window.jsOnGuestRequestPage()) {
        return originalUpdateSongRequestViaAjax.call(this);
      }

      const activePanel =
        typeof window.jsGetActiveSongPanel === "function" ? window.jsGetActiveSongPanel() : "";
      if (activePanel === "special songs") {
        if (typeof window.jsUpdateSpecialSongInTable === "function") {
          window.jsUpdateSpecialSongInTable(
            typeof window.jsGetSpecialSongTypeInModalWindow === "function"
              ? window.jsGetSpecialSongTypeInModalWindow()
              : "",
            typeof window.jsGetHiddenArtistName === "function" ? window.jsGetHiddenArtistName() : "",
            typeof window.jsGetHiddenSongTitle === "function" ? window.jsGetHiddenSongTitle() : "",
            typeof window.jsGetCommentsValueInModalWindow === "function"
              ? window.jsGetCommentsValueInModalWindow()
              : ""
          );
        }
        safeCloseDialog("#edit_song_div");
        return;
      }

      const oldRequestType =
        typeof window.jsGetHiddenRequestType === "function" ? window.jsGetHiddenRequestType() : "";
      const newRequestType =
        typeof window.jsGetRequestTypeInModalWindow === "function"
          ? window.jsGetRequestTypeInModalWindow()
          : oldRequestType;

      if (
        oldRequestType !== newRequestType &&
        typeof window.jsCheckIfUnderRequestTypeLimit === "function" &&
        !window.jsCheckIfUnderRequestTypeLimit(newRequestType)
      ) {
        if (typeof window.jsShowWarningModalWindow === "function") {
          window.jsShowWarningModalWindow(
            "You have reached the maximum number of requests for this request type. Please select another."
          );
        }
        return;
      }

      const songId = typeof window.jsGetSongID === "function" ? window.jsGetSongID() : "";
      removeSongRow(oldRequestType, songId);
      addOfflineMusicRequestRow(
        songId,
        typeof window.jsGetHiddenSongTitle === "function" ? window.jsGetHiddenSongTitle() : "",
        typeof window.jsGetHiddenArtistName === "function" ? window.jsGetHiddenArtistName() : "",
        newRequestType,
        typeof window.jsGetCommentsValueInModalWindow === "function"
          ? window.jsGetCommentsValueInModalWindow()
          : ""
      );
      if (typeof window.jsShowSongAdded === "function") {
        window.jsShowSongAdded(newRequestType);
      }
      safeCloseDialog("#edit_song_div");
      finalizeMusicMutation();
    };

    window.jsDeleteSongViaAjax = function jsDeleteSongViaAjaxOffline() {
      const activePanel =
        typeof window.jsGetActiveSongPanel === "function" ? window.jsGetActiveSongPanel() : "";
      if (activePanel === "special songs") {
        if (typeof window.jsUpdateSpecialSongInTable === "function") {
          window.jsUpdateSpecialSongInTable(
            typeof window.jsGetSpecialSongTypeInModalWindow === "function"
              ? window.jsGetSpecialSongTypeInModalWindow()
              : "",
            "",
            "",
            ""
          );
        }
        safeCloseDialog("#confirm_song_deletion_div");
        safeCloseDialog("#edit_song_div");
        return;
      }

      const requestType =
        typeof window.jsGetHiddenRequestType === "function" ? window.jsGetHiddenRequestType() : "";
      const songId = typeof window.jsGetSongID === "function" ? window.jsGetSongID() : "";
      removeSongRow(requestType, songId);
      safeCloseDialog("#confirm_song_deletion_div");
      safeCloseDialog("#edit_song_div");
      finalizeMusicMutation();
    };

    window.__djepOfflineMusicShimInstalled = true;
  }

  function initGuestRequestsPage() {
    const heading = document.querySelector("#djep-content > h2.djep-h2");
    const content = document.getElementById("djep-content");
    if (!content || !heading || content.dataset.djepGuestRequestsInit) return;
    content.dataset.djepGuestRequestsInit = "1";

    document.body.classList.add("djep-guestrequestspage-ready");

    const metaSource = content.querySelector(':scope > div:first-of-type');
    const backButton = heading.querySelector("a.djep-planeventbutton, a.djep-readviewbutton");
    const descriptionBox = content.querySelector(".djep-guestrequestdescription");
    const howBox = content.querySelector(".djep-guestrequesthowitworksbox");
    const socialBox = content.querySelector(".djep-guestrequestsocialbox");
    const settingsBox = content.querySelector(".djep-guestrequestsettingsbox");
    const requestBox = content.querySelector(".djep-viewrequestboxes");
    const guestAlerts = Array.from(
      content.querySelectorAll("#alert_message_div, #alert_message2_div")
    );

    if (!descriptionBox || !howBox || !settingsBox || !requestBox) return;

    guestAlerts.forEach((node) => node.remove());
    const eventDate = buildGuestRequestsEventDate(metaSource);

    normalizeGuestRequestsHeading(heading, backButton);

    const workspace = buildGuestRequestsWorkspace({
      descriptionBox,
      howBox,
      settingsBox,
      requestBox,
      eventDate,
    });
    content.insertBefore(workspace, descriptionBox);

    cleanupGuestRequestsRoot(content, backButton, [descriptionBox, howBox, socialBox, settingsBox, requestBox]);
    const nextChildren = [];
    if (heading instanceof HTMLElement) nextChildren.push(heading);
    nextChildren.push(workspace);
    content.replaceChildren(...nextChildren);
  }

  function initSongRequestsPage() {
    const form = document.querySelector('#djep-content form[action*="songrequests.asp"]');
    const content = document.getElementById("djep-content");
    const heading = document.querySelector("#djep-content > h2.djep-h2");
    const backButton = form?.querySelector(".djep-readviewbutton");
    if (!content || !form || !heading || form.dataset.djepSongRequestsInit) return;
    form.dataset.djepSongRequestsInit = "1";

    document.body.classList.add("djep-songrequestspage-ready");

    normalizeSongRequestsHeading(heading, backButton);

    const requestBoxes = Array.from(form.querySelectorAll(".djep-viewrequestboxes"));
    const workspace = buildSongRequestsWorkspace(requestBoxes);
    mountSongRequestsWorkspace(form, requestBoxes, workspace, backButton);
    cleanupSongRequestsRoot(form, requestBoxes, backButton);
    content.replaceChildren(heading, form);
  }

  function initSpotifyBrowseStabilityOverride() {
    const musicRoot = document.querySelector(".djep-selectyourmusicbox, .djep-music-panel");
    const spotifyPanel = document.querySelector("#tabs-7");
    const spotifyPlaylistsPanel = spotifyPanel?.querySelector("#spotify-playlists");
    const spotifyTracksPanel = spotifyPanel?.querySelector("#spotify-playlist-tracks");
    const spotifyLegacyConnectDiv = spotifyPanel?.querySelector("#connect_spotify_div");
    const spotifyTabAnchor = document.querySelector("#ui-id-7");
    const spotifyTabItem = spotifyTabAnchor?.closest("li");

    if (!musicRoot || !spotifyPanel || !spotifyPlaylistsPanel || !(spotifyTabAnchor instanceof HTMLElement)) {
      return;
    }

    if (spotifyLegacyConnectDiv instanceof HTMLElement) {
      spotifyLegacyConnectDiv.style.display = "none";
      spotifyLegacyConnectDiv.style.height = "0";
      spotifyLegacyConnectDiv.style.margin = "0";
      spotifyLegacyConnectDiv.style.padding = "0";
      spotifyLegacyConnectDiv.innerHTML = "";
    }

    const showSpotifyPanel = () => {
      showSpotifyTabPanel(spotifyTabItem, spotifyPanel, spotifyTabAnchor);
    };

    const hideSpotifyPanel = () => {
      hideSpotifyTabPanel(spotifyTabItem, spotifyPanel, spotifyTabAnchor, spotifyTracksPanel);
    };

    const getActivePanelId = () => {
      const activeItem =
        spotifyTabItem?.parentElement?.querySelector(":scope > li.ui-tabs-active, :scope > li.ui-state-active") ||
        null;
      const activeAnchor = activeItem?.querySelector("a");
      return (
        activeItem?.getAttribute("aria-controls") ||
        activeAnchor?.getAttribute("href")?.split("#")[1] ||
        ""
      );
    };

    const getVisibleNonSpotifyPanelId = () => {
      const panels = Array.from(document.querySelectorAll(".ui-tabs-panel"));
      const visiblePanel = panels.find((panel) => {
        if (!(panel instanceof HTMLElement)) return false;
        if (panel.id === "tabs-7") return false;
        return window.getComputedStyle(panel).display !== "none";
      });
      return visiblePanel?.id || "";
    };

    const syncSpotifyPanelVisibility = (panelId = "") => {
      const resolvedPanelId = panelId || getVisibleNonSpotifyPanelId() || getActivePanelId();
      if (resolvedPanelId === "tabs-7") {
        showSpotifyPanel();
        return;
      }
      hideSpotifyPanel();
    };

    window.__djepSyncSpotifyPanelVisibility = syncSpotifyPanelVisibility;

    window.loadSpotifyInterface = function loadSpotifyInterfaceStablePatched() {
      loadSpotifyPlaylistsIntoPanel({
        spotifyPanel,
        spotifyPlaylistsPanel,
        spotifyTracksPanel,
        onComplete: () => {
          syncSpotifyPanelVisibility("tabs-7");
        },
        emptyMessage: "Connect Spotify to browse playlists and albums.",
      });
    };

    spotifyTabAnchor.removeAttribute("onclick");
    spotifyTabAnchor.onclick = null;

    if (spotifyTabAnchor.dataset.djepSpotifyStableBound !== "1") {
      spotifyTabAnchor.dataset.djepSpotifyStableBound = "1";
      spotifyTabAnchor.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          showSpotifyPanel();
          window.loadSpotifyInterface();
        },
        true
      );
    }

    const musicTabsNav = spotifyTabItem?.parentElement;
    if (musicTabsNav && musicTabsNav.dataset.djepSpotifyStableHideBound !== "1") {
      musicTabsNav.dataset.djepSpotifyStableHideBound = "1";
      musicTabsNav.addEventListener(
        "click",
        (event) => {
          if (!(event.target instanceof Element)) return;
          const clickedAnchor = event.target.closest("a");
          if (!clickedAnchor || clickedAnchor === spotifyTabAnchor) return;
          const targetPanelId =
            clickedAnchor.closest("li")?.getAttribute("aria-controls") ||
            clickedAnchor.getAttribute("href")?.split("#")[1] ||
            "";
          window.setTimeout(() => syncSpotifyPanelVisibility(targetPanelId), 0);
          window.setTimeout(() => syncSpotifyPanelVisibility(targetPanelId), 180);
          window.setTimeout(() => syncSpotifyPanelVisibility(targetPanelId), 420);
        },
        true
      );
    }

    const visibleNonSpotifyPanelId = getVisibleNonSpotifyPanelId();
    const shouldShowSpotifyOnInit =
      !visibleNonSpotifyPanelId &&
      (window.location.hash === "#tabs-7" || getActivePanelId() === "tabs-7");

    if (shouldShowSpotifyOnInit) {
      showSpotifyPanel();
      window.loadSpotifyInterface();
    } else {
      syncSpotifyPanelVisibility();
    }
  }

  function init() {
    if (injectSharedHooks()) {
      queuePortalReveal();
      return;
    }

    try {
      removePortalNotifications(document);
      bindPortalNotificationsObserver();
      runPageInitializers();
    } finally {
      queuePortalReveal();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
</script>