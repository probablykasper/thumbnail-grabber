var sites = [
  // when adding a manifest, make sure to add the domains of the thumbnail urls
  // to manifest.json.permissions
  {
    name: 'soundcloud',
    matchPattern: '*://*.soundcloud.com/*/*',
    checkUrl: (url) =>
      url.hostname.endsWith('soundcloud.com')
      && url.pathname.split('/').length-1 >= 2
  },
  {
    name: 'youtube',
    matchPattern: '*://*.youtube.com/watch?*',
    checkUrl: (url) =>
      url.hostname.endsWith('youtube.com')
      && url.pathname == '/watch'
      && url.searchParams.has('v')
  }
];

const matchPatterns = [];
for (const site of sites) {
  matchPatterns.push(site.matchPattern);
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
}
