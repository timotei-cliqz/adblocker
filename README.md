# How to use
To generate the safari blocklists run `npm run generate-safari-rules`.

# How it works

We take a number of blocklists in the Adblock format, and convert them to the format required by Apple. For a starting point look into the file `convert-to-safari-rules.ts`.

For more about the Adblock format see:

https://adblockplus.org/filter-cheatsheet

For more about the Apple format see:

https://developer.apple.com/library/archive/documentation/Extensions/Conceptual/ContentBlockingRules/CreatingRules/CreatingRules.html#//apple_ref/doc/uid/TP40016265-CH2-SW1

https://webkit.org/blog/3476/content-blockers-first-look/
