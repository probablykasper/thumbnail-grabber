var sites = [
  // when adding a manifest, make sure to add the domains of the thumbnail urls
  // to manifest.json.permissions
  {
    name: 'soundcloud',
    matchPattern: '*://soundcloud.com/*/*',
    checkUrl: (url) =>
      url.hostname.endsWith('soundcloud.com') // allow www
      && url.pathname.split('/').length-1 >= 2
  },
  {
    name: 'youtube music',
    matchPattern: '*://music.youtube.com/watch?*',
    checkUrl: (url) =>
      url.hostname == 'music.youtube.com'
      && url.pathname == '/watch'
      && url.searchParams.has('v')
  },
  {
    name: 'youtube music playlist',
    matchPattern: '*://music.youtube.com/playlist?*',
    checkUrl: (url) =>
      url.hostname == 'music.youtube.com'
      && url.pathname == '/playlist'
      && url.searchParams.has('list')
  },
  {
    name: 'youtube',
    matchPattern: '*://youtube.com/watch?*',
    checkUrl: (url) =>
      // allow www
      url.hostname.endsWith('youtube.com')
      && url.pathname == '/watch'
      && url.searchParams.has('v')
  },
  // {
  //   name: 'spotify',
  //   matchPattern: '*://open.spotify.com/album/*',
  //   checkUrl: (url) =>
  //     url.hostname.endsWith('open.spotify.com')
  //     && url.pathname.startsWith('/album')
  // },
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
