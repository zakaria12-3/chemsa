<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\FinanceCategory;
use App\Enums\FinanceCategoryType;

class FinanceCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            // Income
            [
                'name' => 'Product Sales',
                'type' => FinanceCategoryType::Income,
                'description' => 'Income from product sales.',
                'legacy_slug' => 'penjualan-produk',
            ],
            [
                'name' => 'Service Revenue',
                'type' => FinanceCategoryType::Income,
                'description' => 'Income from services, repairs, or consultation.',
                'legacy_slug' => 'layanan-jasa',
            ],
            [
                'name' => 'Investment Income',
                'type' => FinanceCategoryType::Income,
                'description' => 'Dividends or interest from investments.',
                'legacy_slug' => 'investasi',
            ],
            [
                'name' => 'Other Income',
                'type' => FinanceCategoryType::Income,
                'description' => 'Income outside the main business activity.',
                'legacy_slug' => 'pendapatan-lain-lain',
            ],

            // Expenses
            [
                'name' => 'Employee Salaries',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Monthly salaries and employee benefits.',
                'legacy_slug' => 'gaji-karyawan',
            ],
            [
                'name' => 'Rent',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Shop, office, or warehouse rent.',
                'legacy_slug' => 'sewa-gedung',
            ],
            [
                'name' => 'Utilities',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Electricity, water, and other utility bills.',
                'legacy_slug' => 'listrik-air',
            ],
            [
                'name' => 'Internet & Phone',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Communication and internet connection costs.',
                'legacy_slug' => 'internet-telepon',
            ],
            [
                'name' => 'Marketing & Advertising',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Promotion, social media ads, and print advertising.',
                'legacy_slug' => 'pemasaran-iklan',
            ],
            [
                'name' => 'Maintenance & Repairs',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Maintenance costs for assets and equipment.',
                'legacy_slug' => 'perawatan-perbaikan',
            ],
            [
                'name' => 'Transport & Logistics',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Fuel, shipping, and business travel costs.',
                'legacy_slug' => 'transportasi-logistik',
            ],
            [
                'name' => 'Stock Purchases',
                'type' => FinanceCategoryType::Expense,
                'description' => 'Cost of purchasing inventory.',
                'legacy_slug' => 'pembelian-stok',
            ],
        ];

        foreach ($categories as $category) {
            $slug = Str::slug($category['name']);

            $financeCategory = FinanceCategory::query()
                ->where('slug', $slug)
                ->orWhere('slug', $category['legacy_slug'])
                ->first();

            $attributes = [
                'name' => $category['name'],
                'slug' => $slug,
                'type' => $category['type'],
                'description' => $category['description'],
            ];

            if ($financeCategory) {
                $financeCategory->update($attributes);
                continue;
            }

            FinanceCategory::create($attributes);
        }
    }
}
