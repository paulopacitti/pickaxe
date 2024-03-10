import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Config
const gcpConfig = new pulumi.Config("gcp");
const zone = gcpConfig.require("zone");
const projectConfig = new pulumi.Config("pickaxe");
const port = projectConfig.require("port");
const cpu = projectConfig.require("cpu");

// Network
const network = new gcp.compute.Network("minecraft-server-network");
const ip = new gcp.compute.Address("minecraft-server-ip");
const firewall = new gcp.compute.Firewall("minecraft-server-firewall", {
  network: network.selfLink,
  allows: [
    {
      protocol: "tcp",
      ports: [port, "22"],
    },
    {
      protocol: "icmp"
    }
  ],
  sourceRanges: ["0.0.0.0/0"],
  targetTags: ["minecraft-server"],
});

// Disk
const disk = new gcp.compute.Disk("minecraft-server-disk", {
  size: 10,
  image: "cos-cloud/cos-stable",
  type: "pd-standard",
  zone
});

// VM instance
const instance = new gcp.compute.Instance("minecraft-server-instance", {
  machineType: `n1-standard-${cpu}`,
  zone: zone,
  tags: ["minecraft-server"],
  bootDisk: {
    autoDelete: false,
    source: disk.selfLink
  },
  metadataStartupScript: `
    docker run -d -p 25565:25565 -e EULA=TRUE -e VERSION=LATEST \
      -v /var/minecraft:/data --name mc -e TYPE=PAPER \
      -e MEMORY=2G --rm=true itzg/minecraft-server:latest;
  `,
  networkInterfaces: [{
    network: network.selfLink,
    accessConfigs: [{
      natIp: ip.address,
    }],
  }],
  scheduling: {
    preemptible: true,
    automaticRestart: false,
  },
});

// Export the IP address
export const ipAddress = ip.address;
