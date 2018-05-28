### Coding rules

#### Mostly everything
- Indent with 4 spaces (JS/CSS/HTML)
- Quote with double quotes (JS/CSS/HTML)
- Do not comment unfinished/not working/old code. Use the Git Luke.

#### JavaScript
- Place opening brace on the same line.
- Write names of variables and functions in _lower camel case_, for example

      const totalZenBalance = totalBalance + getTxBalance(tx);

- Write names of classes in _upper camel case_, for example

      class AddressDialog {
	      /* ... */
	  }

- Write constant names in _constant case_, for example

      const UPDATE_INTERVAL = 60; // seconds

- Prefer cloning HTML `<template>`s to constructing DOM trees manually.

#### HTML
- Do not quote _simple_ HTML attribute values, for example

      <span id=foo class=bar>

  instead of

      <span id="foo" class="bar">

  unless you have to, for example

      <span id=foo class="bar baz">

- Write identifiers (values of `id`, `class`, `name`, `data-tr`, etc.) in _lower camel case_, for example

      <span id=totalBalance class=bigLabel>
