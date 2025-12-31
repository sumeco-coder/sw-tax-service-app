export function validateFile(file: File) {
  const allowed = ["application/pdf", "image/jpeg", "image/png"];

  if (!allowed.includes(file.type)) {
    throw new Error("Invalid file type");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Max file size is 10MB");
  }

  return true;
}
