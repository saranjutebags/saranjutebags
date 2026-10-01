export const getItemImage = (item, products = []) => {
  if (item.selectedImage && !item.selectedImage.startsWith('data:')) return item.selectedImage;
  const urlImage = (item.images || []).find(img => img && !img.startsWith('data:'));
  if (urlImage) return urlImage;
  // Chunked orders keep '' placeholders in images until hydration rebuilds
  // them — skip empty entries instead of returning a broken image URL.
  const firstReal = (item.images || []).find(img => img && img.length > 0);
  if (firstReal) return firstReal;
  const product = products.find(p => String(p.id) === String(item.id));
  if (product) {
    const productImage = (product.images || []).find(img => img && img.length > 0);
    if (productImage) return productImage;
  }
  return null;
};
