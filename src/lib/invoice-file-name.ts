export function invoiceFileName(file: {
  name: string;
  fullFileExtension?: string;
}) {
  const extension = file.fullFileExtension;
  if (
    !extension ||
    file.name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
  )
    return file.name;
  return `${file.name}.${extension}`;
}
