/*
 * Figma file constants — IDs, metadata, section deep-links.
 *
 * Both V1 and V2 point to the SHARED Loblaw Digital design files (using
 * the auto-load query params Creighton supplied so the embed lands on the
 * canonical entry frame). V1 keeps its preserved section deep-links;
 * V2 starts with a single Cover entry — add more node-ids as designs land.
 *
 * `embedUrl(canonicalUrl)` wraps any Figma URL in the embed pattern Figma documents:
 *   https://www.figma.com/embed?embed_host=share&url=<encoded>
 */

export function embedUrl(canonicalUrl) {
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(canonicalUrl)}`;
}

const V1_FILE = 'cKsRu32uAlYS3tklgxnlyr';
const V1_PATH = '-SHARED--Project-Remedy-V1.0';
const V1_QUERY = '?m=auto&t=pKrp3u9QgHlxdYqL-6';

const V2_FILE = 'G3joMlCs42Suu3T3Mw75Wg';
const V2_PATH = '-SHARED--Project-Remedy-V2.0';
const V2_QUERY = '?m=auto&t=pKrp3u9QgHlxdYqL-6';

const v1Url = (extra = '') => `https://www.figma.com/design/${V1_FILE}/${V1_PATH}${extra || V1_QUERY}`;
const v2Url = (extra = '') => `https://www.figma.com/design/${V2_FILE}/${V2_PATH}${extra || V2_QUERY}`;

export const VERSIONS = [
  {
    id: 'v2',
    label: 'V2',
    title: 'Project Remedy — V2',
    tag: 'Active',
    tagClass: 'mint',
    audience: 'GA — Ontario launch',
    date: 'May 1, 2026',
    desc: 'Loblaw Digital shared design file for the V2.0 GA build. Active design surface.',
    fileId: V2_FILE,
    fileUrl: v2Url(),
    coverFrame: v2Url(),
    sections: [
      { name: 'Cover', url: v2Url() },
    ],
  },
  {
    id: 'v1',
    label: 'V1',
    title: 'Project Remedy — V1',
    tag: 'Pilot',
    tagClass: 'sky',
    audience: '100-user internal pilot',
    date: 'Apr 1, 2026',
    desc: 'Loblaw Digital shared design file for the V1 pilot release.',
    fileId: V1_FILE,
    fileUrl: v1Url(),
    coverFrame: v1Url(),
    sections: [
      { name: 'Cover',                  url: v1Url() },
      { name: 'Entry Point',            url: v1Url('?node-id=2807-45852') },
      { name: 'Chat UI',                url: v1Url('?node-id=2807-45851') },
      { name: 'Chat Components',        url: v1Url('?node-id=3037-4232') },
      { name: 'Consent & Permissions',  url: v1Url('?node-id=2807-45855') },
      { name: 'Conversation History',   url: v1Url('?node-id=2807-45853') },
      { name: 'Nav & Care Routing',     url: v1Url('?node-id=2807-45857') },
      { name: 'Red Flag Escalation',    url: v1Url('?node-id=2807-45859') },
    ],
  },
];

export function getVersion(id) {
  return VERSIONS.find(v => v.id === id) || VERSIONS[0];
}
