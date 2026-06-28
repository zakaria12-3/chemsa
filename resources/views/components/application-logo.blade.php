@props(['alt' => 'CHEMSA logo'])

<img
    src="{{ asset('images/chemsa-logo.jpg') }}"
    alt="{{ $alt }}"
    {{ $attributes->merge(['class' => 'object-contain']) }}
>
