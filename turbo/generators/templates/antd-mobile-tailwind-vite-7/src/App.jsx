import { Button, List } from "antd-mobile";

function ProductCard() {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      {/* Tailwind for layout */}
      <div className="flex items-center gap-3">
        <img
          className="w-20 h-20 rounded-md object-cover"
          src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
          alt="Product"
        />
        <div className="flex-1">
          <h3 className="text-base font-semibold">Nike Air Max</h3>
          <p className="text-sm text-gray-500">Classic comfort and style.</p>
        </div>
      </div>

      {/* antd-mobile components */}
      <Button block color="primary" className="mt-4">
        Add to Cart
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <div className="bg-gray-50 min-h-screen p-4 safe-area-top safe-area-bottom">
      <h1 className="text-2xl font-bold mb-6">Store</h1>
      <div className="space-y-4">
        <ProductCard />
        <ProductCard />
      </div>
    </div>
  );
}
