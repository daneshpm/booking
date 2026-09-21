"""FastAPI service package.

This file is deliberately empty of logic but must exist. Without it `app` is
only a namespace-package candidate, and Python keeps scanning sys.path after
finding it — so any plain `app.py` on a later entry (an editable install of
another project, for example) wins and every `from app...` import fails with
"'app' is not a package". A regular package resolves at the first entry and
cannot be shadowed that way.
"""
