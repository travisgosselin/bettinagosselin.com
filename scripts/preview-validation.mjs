export function validateManifest(manifest, { repository, pr, headSha }) {
  if (manifest.version !== 1 || manifest.repository !== repository || manifest.pr !== pr ||
      manifest.headSha !== headSha || !Array.isArray(manifest.images) ||
      manifest.images.length < 1 || manifest.images.length > 40) throw new Error('Invalid preview manifest identity or image count');
  const names = new Set();
  for (const image of manifest.images) {
    if (!/^[a-z0-9-]+\.png$/.test(image.file) || names.has(image.file) ||
        !['desktop', 'mobile'].includes(image.viewport) ||
        !/^(?:|the-book\.html|my-story\.html|blog\/|blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/)$/.test(image.route)) {
      throw new Error('Invalid preview image metadata');
    }
    names.add(image.file);
  }
  return manifest.images;
}

export function validatePng(data, viewport) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (data.length < 33 || data.length > 10 * 1024 * 1024 || !data.subarray(0, 8).equals(signature) ||
      data.readUInt32BE(8) !== 13 || data.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG');
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width !== (viewport === 'desktop' ? 1440 : 390) || height < 100 || height > 30000) {
    throw new Error('Unexpected PNG dimensions');
  }
}
