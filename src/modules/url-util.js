var sites = [
  {
    name: 'soundcloud',
    matchPattern: '*://*.soundcloud.com/*',
    specificMatchPattern: '*://*.soundcloud.com/*/*',
    checkUrl: (url) =>
      url.hostname.endsWith('soundcloud.com')
      && url.pathname.split('/').length-1 >= 2
  },
  {
    name: 'youtube',
    matchPattern: '*://*.youtube.com/*',
    specificMatchPattern: '*://*.youtube.com/watch?*',
    checkUrl: (url) =>
      url.hostname.endsWith('youtube.com')
      && url.pathname == '/watch'
      && url.searchParams.has('v')
  }
];

const matchPatterns = [];
const specificMatchPatterns = [];
for (const site of sites) {
  matchPatterns.push(site.matchPattern);
  specificMatchPatterns.push(site.specificMatchPattern);
}
module.exports = {
  getSite: (url) => {
    for (const site of sites) {
      if (site.checkUrl(new URL(url))) {
        return site.name;
      };
    }
  },
  matchPatterns,
  specificMatchPatterns,
}
