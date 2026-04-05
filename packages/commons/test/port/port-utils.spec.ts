import { List } from "immutable";
import { findOpenPort } from "@zeroshotbuilders/commons";
import net from "net";

describe("findOpenPort", () => {
  let servers: List<net.Server> = List();

  beforeAll((done) => {
    const blockedPorts = List([7080, 7081, 7082]);
    let remainingPorts = blockedPorts.size;
    blockedPorts.forEach((port) => {
      const server = net.createServer();
      server.listen(port, () => {
        remainingPorts--;
        if (remainingPorts === 0) {
          done();
        }
      });
      servers = servers.push(server);
    });
  });

  afterAll(() => {
    servers.forEach((server) => {
      server.close();
    });
  });

  test("should find 8083 as the first open port", async () => {
    const openPort = await findOpenPort({ minPort: 7080, maxPort: 7085 });
    expect(openPort).toEqual(7083);
  });
});
