export const getItemImage = (item, products = []) => {
  if (item.selectedImage && !item.selectedImage.startsWith('data:')) return item.selectedImage;
  const urlImage = (item.images || []).find(img => img && !img.startsWith('data:'));
  if (urlImage) return urlImage;
  if (item.images?.length > 0) return item.images[0];
  const product = products.find(p => String(p.id) === String(item.id));
  if (product) return product.images?.[0] || null;
  return null;
};
