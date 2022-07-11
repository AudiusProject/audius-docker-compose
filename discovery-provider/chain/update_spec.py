#!/usr/bin/env python3

# CLI to update the chainspec

import click
import dotenv
import json
import os
import pathlib


EXTRA_VANITY = "0x22466c6578692069732061207468696e6722202d204166726900000000000000"
EXTRA_SEAL = "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"


@click.group()
@click.pass_context
def cli(ctx):
    """A CLI to generate and modify"""
    ctx.ensure_object(dict)
    ctx.obj["manifests_path"] = pathlib.Path(
        os.path.join(
            os.path.dirname(os.path.realpath(__file__)),
            "../../",
        )
    )


@cli.command()
@click.pass_context
def set_genesis(ctx):
    """
    Sets the genesis address in the chainspec with the appropriate
    keys for sealing blocks from the override.env.
    This command isonly intended to be run by the genesis validator
    of the network.
    """
    # Get signer from override.env
    override_env = ctx.obj["manifests_path"] / "discovery-provider" / "override.env"
    override_env_data = dotenv.dotenv_values(override_env)
    signer = override_env_data.get("audius_delegate_owner_wallet")
    signer = signer.replace("0x", "")  # trim 0x from pubkey

    # Compute extra data
    extra_data = f"{EXTRA_VANITY}{signer}{EXTRA_SEAL}"
    print("Genesis EXTRA_DATA:")
    print(extra_data)

    # Update chainspec
    spec = ctx.obj["manifests_path"] / "discovery-provider" / "chain" / "spec.json"
    spec_data = json.load(open(spec))
    spec_data["genesis"]["extraData"] = extra_data
    with open(spec, "w") as f:
        json.dump(spec_data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("spec.json updated")


if __name__ == "__main__":
    cli(obj={})
