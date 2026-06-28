@props(['title' => ''])
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'CHEMSA') }}{{ !empty($title) ? ' | ' . $title : '' }}</title>
        <link rel="icon" href="{{ asset('images/chemsa-logo.jpg') }}">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @livewireStyles
    </head>
    <body class="font-sans text-foreground antialiased bg-background">
        <div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0">
            <a href="/" class="flex flex-col items-center gap-2">
                <x-application-logo class="h-28 w-28 rounded-lg" />
                <span class="text-center leading-tight">
                    <span class="block text-2xl font-semibold tracking-wide">CHEMSA</span>
                    <span class="block text-sm font-semibold text-red-600">Cherif Multi-Services Automobile</span>
                </span>
            </a>
            <div class="w-full sm:max-w-md mt-6 px-6 py-4 text-foreground overflow-hidden">
                {{ $slot }}
            </div>
        </div>
        @livewireScripts
    </body>
</html>
