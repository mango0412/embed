```
https://mango0412.github.io/embed/?v={Video ID}
```

```
window.addEventListener('message', ({ data }) => {
  if (data?.type === 'videoEvent' && data?.event === 'ended') {
    // code here.
  }
});
```
