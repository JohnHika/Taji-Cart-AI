// Shrinks a camera-captured photo client-side before it goes over the wire.
// A raw phone photo is commonly 3-8MB; on a slow/flaky shop connection that's
// exactly what causes an upload to sit "stuck" until it eventually times out.
// Resizing to a reasonable max dimension and re-encoding as JPEG typically
// gets this under ~300KB while keeping SMS text on the screen legible.
//
// Speed matters here: this runs between the cashier's shot and the first
// visible feedback. createImageBitmap decodes OFF the main thread and skips
// the object-URL dance of the old Image() path — noticeably faster on the
// low-end Androids the shop actually uses — with Image() kept as the fallback
// for older browsers.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

const decodeViaImageBitmap = async (file) => {
  // 'from-image' respects the camera's EXIF orientation so the shot isn't
  // rotated wrong on disk. Browsers that don't know the option ignore it
  // harmlessly; browsers without createImageBitmap throw and we fall back.
  return createImageBitmap(file, { imageOrientation: 'from-image' });
};

const decodeViaImg = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });

const decodeImage = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await decodeViaImageBitmap(file);
    } catch {
      // fall through to the Image() path
    }
  }
  return decodeViaImg(file);
};

export const compressImage = async (file) => {
  if (!file || !file.type?.startsWith('image/')) {
    return file;
  }

  try {
    const img = await decodeImage(file);

    // A malformed file can sometimes "load" with zero intrinsic dimensions
    // instead of firing onerror. Drawing that to canvas would silently
    // produce a near-empty blob that then passes the size check below as a
    // "successful" compression — exactly the blank-image failure this
    // exists to prevent. Bail out to the original file instead.
    if (!img.width || !img.height) {
      return file;
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));

    // Already small (e.g. a screenshot, not a full-res camera photo) — no
    // point re-encoding it, that would only spend time for no size benefit.
    if (scale >= 1 && file.size <= 300 * 1024) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // createImageBitmap results hold significant memory until closed —
    // release as soon as the canvas copy exists.
    if (typeof img.close === 'function') img.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob || blob.size < 1024 || blob.size >= file.size) {
      // Compression didn't help, or produced something implausibly tiny for
      // a real photo (rare, e.g. already-compressed source or a canvas
      // read-back failure) — uploading the original is strictly safer.
      return file;
    }

    const baseName = file.name ? file.name.replace(/\.\w+$/, '') : 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    // Canvas couldn't decode this file (e.g. an unusual format) — fall back
    // to the original rather than blocking the upload entirely.
    return file;
  }
};

export default compressImage;