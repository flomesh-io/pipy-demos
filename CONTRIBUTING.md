# Pipy Community

Pipy Demos is an Open Source community-driven project and we welcome contributions as well as feedback from the community.

## Contributing to the Demos

We do have a few guidelines in place to help you be successful with your contribution to the Demos.

Here's a quick checklist for a good PR, more details below:

1. [Pipy Slack channel](https://join.slack.com/t/flomesh-io/shared_invite/zt-13pgb69qr-PLwebvtxXHdv6jc686ru0w)
2. A GitHub Issue with a good description associated with the PR
3. One feature/change per PR
4. One commit per PR
5. PR rebased on main (`git rebase`, not `git pull`)
6. Commit message is prefixed by the issue number (for example `#12 Message`)
7. No changes to code not directly related to your PR
8. Includes functional/integration test
9. Includes documentation

Once you have submitted your PR please monitor it for comments/feedback. We reserve the right to close inactive PRs if
you do not respond within 2 weeks (bear in mind you can always open a new PR if it is closed due to inactivity).


### Create an issue

Take your time to write a proper issue including a good summary and description.

Remember this may be the first thing a reviewer of your PR will look at to get an idea of what you are proposing
and it will also be used by the community in the future to find about what new features and enhancements are included in
new releases.


The [issue tracker](https://github.com/flomesh-io/pipy-demos/issues) is the heart of Pipy's work. Use it for bugs, questions, proposals and feature requests.

Please always **open a new issue before sending a pull request** if you want to add a new feature to Pipy, unless it is a minor fix, and wait until someone from the core team approves it before you actually start working on it. Otherwise, you risk having the pull request rejected, and the effort implementing it goes to waste. And if you start working on an implementation for an issue, please **let everyone know in the comments** so someone else does not start working on the same thing.

Regardless of the kind of issue, please make sure to look for similar existing issues before posting; otherwise, your issue may be flagged as `duplicated` and closed in favour of the original one. Also, once you open a new issue, please make sure to honour the items listed in the issue template.

If you open a question, remember to close the issue once you are satisfied with the answer and you think
there's no more room for discussion. We'll anyway close the issue after some days.

If something is missing from Pipy it might be that it's not yet implemented or that it was purposely left out. If in doubt, just ask.

## This guide

If this guide is not clear and it needs improvements, please send pull requests against it. Thanks! :-)

## Making good pull requests

When preparing your PR make sure you have a single commit and your branch is rebased on the main branch from the project repository.

This means use the `git rebase` command and not `git pull` when integrating changes from main to your branch. See
[Git Documentation](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) for more details.

We require that you squash to a single commit. You can do this with the `git rebase -i HEAD~X` command where X
is the number of commits you want to squash. See the [Git Documentation](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
for more details.

The above helps us review your PR and also makes it easier for us to maintain the repository.  We also require that the commit message is prefixed with the issue number (example commit message `#12 My super cool new feature`).

### Minimum requirements

1. Describe reasons and result of the change in the pull request comment.
2. Do not force push to a pull request. The development history should be easily traceable.
3. Any change to a public API requires appropriate documentation: params (and particularly interesting combinations of them if the method is complex), results, interesting, self-contained examples.


## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct][ccoc].
By participating in this project you agree to abide by its terms.

[ccoc]: https://github.com/flomesh-io/pipy-demos/blob/main/CODE_OF_CONDUCT.md
