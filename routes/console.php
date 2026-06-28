<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Setting;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Enums\PaymentMethod;
use App\Enums\PurchaseStatus;
use App\Enums\SaleStatus;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('settings:chemsa-currency', function () {
    Setting::set('store_name', 'CHEMSA');
    Setting::set('store_address', 'Cherif Multi-Services Automobile');
    Setting::set('currency_symbol', 'TND');
    Setting::set('currency_position', 'right');
    Setting::set('currency_fraction_digits', '3');
    Setting::set('currency_thousand_separator', ' ');
    Setting::set('currency_decimal_separator', ',');

    $this->info('CHEMSA Tunisian Dinar settings applied.');
})->purpose('Apply CHEMSA Tunisian Dinar currency defaults');

Artisan::command('sales:dummy-receipt', function () {
    [$sale, $purchase] = DB::transaction(function () {
        $user = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'admin',
                'email' => 'admin@admin.com',
                'password' => bcrypt('password'),
            ]
        );

        $supplier = Supplier::firstOrCreate(
            ['email' => 'test.supplier@chemsa.local'],
            [
                'name' => 'Test Supplier',
                'contact_person' => 'CHEMSA Test Desk',
                'phone' => '+216 11 111 111',
                'address' => 'Sfax, Tunisia',
            ]
        );

        $customer = Customer::firstOrCreate(
            ['email' => 'test.customer@chemsa.local'],
            [
                'name' => 'Test Customer',
                'phone' => '+216 00 000 000',
                'address' => 'Tunis, Tunisia',
            ]
        );

        $category = Category::firstOrCreate(
            ['slug' => 'test-automobile'],
            [
                'name' => 'Test Automobile',
                'description' => 'Temporary test category for receipt checks.',
            ]
        );

        $unit = Unit::firstOrCreate(
            ['symbol' => 'pcs'],
            ['name' => 'Pieces']
        );

        $product = Product::firstOrCreate(
            ['sku' => 'CHEMSA-TEST-001'],
            [
                'category_id' => $category->id,
                'unit_id' => $unit->id,
                'name' => 'Test Oil Filter',
                'purchase_price' => 12000,
                'selling_price' => 25000,
                'quantity' => 50,
                'min_stock' => 1,
                'is_active' => true,
                'description' => 'Dummy product for receipt testing.',
            ]
        );

        $invoiceNumber = 'TEST-' . now()->format('ymd-His') . '-' . Str::upper(Str::random(3));
        $purchaseInvoiceNumber = 'PUR-' . now()->format('ymd-His') . '-' . Str::upper(Str::random(3));
        $quantity = 2;
        $unitPrice = 25000;
        $discount = 1000;
        $finalPrice = $unitPrice - $discount;
        $subtotal = $finalPrice * $quantity;
        $cashReceived = 60000;

        $sale = Sale::create([
            'invoice_number' => $invoiceNumber,
            'customer_id' => $customer->id,
            'created_by' => $user->id,
            'sale_date' => now(),
            'status' => SaleStatus::COMPLETED,
            'subtotal' => $subtotal,
            'global_discount' => 0,
            'total_discount' => $discount * $quantity,
            'total' => $subtotal,
            'cash_received' => $cashReceived,
            'change' => $cashReceived - $subtotal,
            'payment_method' => PaymentMethod::CASH,
            'notes' => 'Dummy receipt generated for desktop print testing.',
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'quantity' => $quantity,
            'cost_price' => 12000,
            'unit_price' => $unitPrice,
            'discount' => $discount,
            'final_price' => $finalPrice,
            'subtotal' => $subtotal,
        ]);

        $purchaseTotal = 3 * 12000;
        $purchase = Purchase::create([
            'invoice_number' => $purchaseInvoiceNumber,
            'supplier_id' => $supplier->id,
            'purchase_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'total' => $purchaseTotal,
            'status' => PurchaseStatus::PAID,
            'notes' => 'Dummy purchase generated for desktop testing.',
            'created_by' => $user->id,
        ]);

        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 12000,
            'selling_price' => 25000,
            'subtotal' => $purchaseTotal,
        ]);

        return [$sale, $purchase];
    });

    $this->info("Dummy receipt sale created: {$sale->invoice_number}");
    $this->line("Sale ID: {$sale->id}");
    $this->line('Receipt path: /sales/' . $sale->id . '/print');
    $this->info("Dummy purchase created: {$purchase->invoice_number}");
    $this->line("Purchase ID: {$purchase->id}");
})->purpose('Create a dummy completed sale for receipt print testing');
