# Docs Module

## Overview

The `docs` module is part of time-tracker.

## Usage

```javascript
const { DocsHandler } = require('time-tracker/docs');

const handler = new DocsHandler({
  timeout: 5000,
  retries: 3
});

await handler.execute();
```

## API

### `new DocsHandler(config)`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| config.timeout | number | 5000 | Timeout in ms |
| config.retries | number | 3 | Retry count |
