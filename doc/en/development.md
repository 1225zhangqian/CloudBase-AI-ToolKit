# Development Guide

## Basic Workflow

### 1) Log in to CloudBase

```
Log in to CloudBase
```

Your AI will guide you through Tencent Cloud login and CloudBase environment selection.

### 2) Environment management

Switch environment:

```
Log out of CloudBase
```

Verify current environment:

```
Query current CloudBase environment info
```

### 3) Start building

Describe your requirement to the AI:

```
Build an online two-player Gomoku website with real-time multiplayer, and deploy it
```

Your AI can automatically:

- Generate frontend + backend code
- Deploy to CloudBase
- Return an online access link

## Debugging

### Handling errors

```
I got an error: xxxx
```

### Debugging cloud functions

```
The cloud function behavior doesn't match the requirement: xxx. Please check logs and data, debug it, and fix it.
```

## Supported Application Types

### Web apps

- Modern frontend + static hosting
- Supports popular frameworks like React and Vue
- CDN acceleration

### WeChat Mini Programs

- CloudBase Mini Program solution
- Cloud database + cloud functions
- Supports advanced capabilities like cloud invocation

### Backend services

- Cloud database
- Serverless cloud functions
- File storage and CDN

## Best Practices

1. **Describe requirements clearly** - helps AI generate more accurate code
2. **Provide complete error messages** - helps AI locate issues faster
3. **Use logs** - ask the AI to inspect logs during diagnosis
4. **Iterate incrementally** - build and refine step by step
