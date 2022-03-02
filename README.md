# Pairwise Helper

This is a cleaned up version of [some very old code I wrote to calculate pairwise combinations of test factors](https://github.com/winjs/winjs/blob/b9e0b33f76c57caac941c9b1885bf69443320b1c/tests/TestLib/Helper.ts#L1697).

The main idea is that most defects in software come from a combination of two factors, with fewer requiring three or more parameters in order to occur. This means that if you're testing a very complicated configuration, you do not need to exhaustively test every possible combination of options in order to find all bugs!

Instead, you want to test each combination of two options, which can be condensed into fewer overall runs than an exhaustive iteration. Calculating this optimized matrix can be quite tricky, however, so that's where this code comes in.

## Caveats

I updated this code recently to try to use more modern JS constructs and stronger TS typing. Unfortunately, I never wrote tests for my test helper (alas), so I may have introduced some recent regressions.

## Further Reading

For those interested in the problem space, there is a [lovely MSDN article on pairwise testing](http://msdn.microsoft.com/en-us/library/cc150619.aspx) that talks about the theory behind this helper.
