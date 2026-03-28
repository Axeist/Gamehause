import React, { useState, useEffect } from 'react';
import { Product } from '@/types/pos.types';
import { supabase, handleSupabaseError, convertFromSupabaseProduct, convertToSupabaseProduct } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/utils/pos.utils';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const lowStockProducts = products.filter(p => p.stock < 5 && p.category !== 'membership');
  
  useEffect(() => {
    console.log('useProducts initialized with', products.length, 'products');
    
    refreshFromDB().catch(err => {
      console.error('Error loading products from DB:', err);
    });
  }, []);
  
  const isProductDuplicate = (productName: string, excludeId?: string): boolean => {
    return products.some(p => 
      p.name.toLowerCase() === productName.toLowerCase() && 
      (!excludeId || p.id !== excludeId)
    );
  };
  
  const addProduct = (product: Omit<Product, 'id'>) => {
    try {
      if (isProductDuplicate(product.name)) {
        toast({
          title: 'Error',
          description: `A product with name "${product.name}" already exists`,
          variant: 'destructive'
        });
        throw new Error(`Product "${product.name}" already exists`);
      }
      
      const newProductId = generateId();
      const newProduct: Product = {
        ...product,
        id: newProductId,
        totalStock: product.totalStock ?? product.stock,
        sellingPrice: product.sellingPrice || product.price,
        // Note: profit will be calculated by the database trigger
      };
      
      setProducts(prev => [...prev, newProduct]);
      
      // Convert to Supabase format WITH the ID (for inserts)
      const insertData = convertToSupabaseProduct(newProduct, true);
      
      // Ensure we never send updated_at or created_at in insert payload
      delete insertData.updated_at;
      delete insertData.updatedAt;
      // created_at will be set automatically by the database
      
      supabase
        .from('products')
        .insert(insertData)
        .then(({ error }) => {
          if (error) {
            console.error('Error adding product to DB:', error);
            setError(`Failed to add product to database: ${error.message}`);
            toast({
              title: 'Database Error',
              description: `Product added locally but failed to sync with database: ${error.message}`,
              variant: 'destructive'
            });
          } else {
            console.log('Product added to DB:', newProduct.name);
          }
        });
      
      toast({
        title: 'Success',
        description: 'Product added successfully',
      });
      
      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to add product',
          variant: 'destructive'
        });
      }
      
      setError(error instanceof Error ? error.message : 'Unknown error adding product');
      throw error;
    }
  };
  
  const updateProduct = (product: Product) => {
    try {
      // Validate product ID - must not be "new" or empty
      if (!product.id || product.id === 'new') {
        toast({
          title: 'Error',
          description: 'Invalid product ID. Cannot update product without a valid ID.',
          variant: 'destructive'
        });
        throw new Error('Invalid product ID');
      }
      
      if (isProductDuplicate(product.name, product.id)) {
        toast({
          title: 'Error',
          description: `Another product with name "${product.name}" already exists`,
          variant: 'destructive'
        });
        throw new Error(`Another product named "${product.name}" already exists`);
      }
      
      // Ensure selling price is set to price if not provided
      const updatedProduct = {
        ...product,
        sellingPrice: product.sellingPrice || product.price,
        // Note: profit will be calculated by the database trigger
      };
      
      // Remove any fields that shouldn't be sent to the database
      const cleanProduct = { ...updatedProduct };
      // Remove updated_at if it exists (products table doesn't have this field)
      delete (cleanProduct as any).updated_at;
      delete (cleanProduct as any).updatedAt;
      
      setProducts(prev => prev.map(p => p.id === cleanProduct.id ? cleanProduct : p));
      
      // Convert to Supabase format WITHOUT the ID (for updates, ID is in the .eq() clause)
      const updateData = convertToSupabaseProduct(cleanProduct, false);
      
      // Ensure we never send id, updated_at, or created_at in update payload
      delete updateData.id;
      delete updateData.updated_at;
      delete updateData.updatedAt;
      delete updateData.created_at;
      delete updateData.createdAt;
      
      supabase
        .from('products')
        .update(updateData)
        .eq('id', cleanProduct.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating product in DB:', error);
            setError(`Failed to update product in database: ${error.message}`);
            toast({
              title: 'Database Sync Error',
              description: `Product updated locally but failed to sync with database: ${error.message}`,
              variant: 'destructive'
            });
            // Don't try to insert if update fails - that would create duplicates
          } else {
            console.log('Product updated in DB:', cleanProduct.name);
            toast({
              title: 'Success',
              description: 'Product updated successfully',
            });
          }
        });
      
      return cleanProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update product',
          variant: 'destructive'
        });
      }
      
      setError(error instanceof Error ? error.message : 'Unknown error updating product');
      throw error;
    }
  };
  
  const deleteProduct = (id: string) => {
    try {
      setProducts(prev => prev.filter(p => p.id !== id));
      
      supabase
        .from('products')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Error deleting product from DB:', error);
            setError(`Failed to delete product from database: ${error.message}`);
            toast({
              title: 'Database Sync Error',
              description: `Product deleted locally but failed to sync with database: ${error.message}`,
              variant: 'destructive'
            });
          } else {
            console.log('Product deleted from DB:', id);
          }
        });
      
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive'
      });
      setError(error instanceof Error ? error.message : 'Unknown error deleting product');
      throw error;
    }
  };
  
  const resetToInitialProducts = () => {
    setProducts([]);
    setError(null);
    console.log('Reset to empty products array');
    return [];
  };
  
  const refreshFromDB = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('products').select('*');
      
      if (error) {
        console.error('Error fetching products:', error);
        setError(`Failed to fetch products: ${error.message}`);
        toast({
          title: 'Error',
          description: 'Failed to fetch products from database',
          variant: 'destructive'
        });
        return products;
      }
      
      if (data && data.length > 0) {
        const dbProducts = data.map(convertFromSupabaseProduct);
        
        const uniqueProductsById = new Map<string, Product>();
        const duplicates: string[] = [];
        
        dbProducts.forEach(product => {
          if (!uniqueProductsById.has(product.id)) {
            const productNameLower = product.name.toLowerCase();
            const duplicateByName = Array.from(uniqueProductsById.values()).find(
              p => p.name.toLowerCase() === productNameLower && p.id !== product.id
            );
            
            if (duplicateByName) {
              duplicates.push(`${product.name} (ID: ${product.id})`);
            } else {
              uniqueProductsById.set(product.id, product);
            }
          }
        });
        
        if (duplicates.length > 0) {
          const duplicateNames = duplicates.slice(0, 3).join(', ') + 
            (duplicates.length > 3 ? ` and ${duplicates.length - 3} more` : '');
          
          toast({
            title: 'Duplicate Products Removed',
            description: `${duplicates.length} duplicate products were found and removed: ${duplicateNames}`,
            variant: "default"
          });
          
          console.warn('Duplicate products removed:', duplicates);
        }
        
        const allProducts = Array.from(uniqueProductsById.values());
        setProducts(allProducts);
        console.log('Refreshed from DB:', allProducts.length);
        
        localStorage.setItem('cuephoriaProducts', JSON.stringify(allProducts));
        
        return allProducts;
      } else {
        console.log('No products in DB, using empty products array');
        toast({
          title: 'Info',
          description: 'No products found in database.',
        });
        
        return resetToInitialProducts();
      }
    } catch (error) {
      console.error('Error refreshing products:', error);
      setError(error instanceof Error ? error.message : 'Unknown error refreshing products');
      toast({
        title: 'Error',
        description: 'An error occurred while refreshing products',
        variant: 'destructive'
      });
      return products;
    } finally {
      setLoading(false);
    }
  };
  
  const displayLowStockWarning = () => {
    toast({
      title: "Low Stock Alert",
      description: `You have ${lowStockProducts.length} products with low stock levels.`,
      variant: "destructive"
    });
  };
  
  return {
    products,
    loading,
    error,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    resetToInitialProducts,
    refreshFromDB,
    displayLowStockWarning
  };
};

export default useProducts;
