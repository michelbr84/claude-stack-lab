"""Smoke test placeholder for the inherited CMP CI 'Run Example Tests' step.

The CI workflow in this repo runs ``pytest --collect-only`` against
this directory. Having a single trivially-passing test keeps the
inherited workflow green until a real demo lands.
"""


def test_collection_works() -> None:
    assert 1 + 1 == 2
