# MolecuLarva — Molecular Simulation

**English** | [Русский](README.ru.md)

This project is an experiment that visualizes the behavior of particles
in 2D and 3D space:

* Collisions and rebounds of particles upon contact.
* Simulation of forces of attraction and repulsion between particles.
* Building connections between particles and the influence of other particles on these connections.
* Transformations of particle types when a connection is created, including merging of two particles into one.
* Spontaneous decay, splitting, or disappearance of particles over time.
* The influence of temperature and other environmental factors on the behavior of particles.

Particles of different types are visualized in different colors. Their properties, presented in the configuration of the world, depend on the type of particle:

1. **Gravity coefficient matrix** shows whether a particle of one type will attract or repel a particle of another type in the case when they are not linked to each other, and with what force.
2. **Link bias matrix** shows whether a particle of one type will attract or repel a particle of another type along the bond in the case when they are already linked to each other, and with what force.
3. **Connection limit map** shows the maximum total number of links for particles of each type.
4. **Connection weight matrix** shows the weight occupied by the link between a particle of type A and a particle of type B in the overall limit on the number of bonds of a particle of type A (in Connection limit map). The maximum number of partners of each type is derived from this weight and the connection limit.
5. **Bond preference matrix** shows which connections a particle prefers. When the connection limit is already reached, a new bond may replace a weaker existing one if its preference is strictly higher.
6. **Link length map** and **link stiffness map** show the preferred length and elastic force of bonds for particles of each type. For a bond between two types these values are averaged.
7. **Tensor of influence on neighbors' bond preference** shows how particles of type A, when linked to B or C, affect the preference of the bond between particles of type B and type C.
8. **Tensor of influence on neighbors' link strength** shows how particles of type A, when linked to B or C, affect the elastic force and the maximum length of the bond between particles of type B and type C.
9. **Transformations** show how a particle of type A changes its type when it creates a connection with a particle of type B, or how A and B merge into a new type on contact.
10. **Decay rules** show how a particle of a given type may change, split, or disappear over time, and which neighboring types stabilize it against decay.

Each type also has its own name, color, radius, mass, and frequency in the initial distribution of particles.

The main goal of this project is to study self-organizing systems and explore configurations in which conditions for
spontaneous emergence of artificial life will be present.

## Demo

[Default types config](https://olegzlobin.github.io/molecular-ts/) (C, H, O, N): particles form bonds and small molecules.

[![Default config](docs/default-config.webp)](https://olegzlobin.github.io/molecular-ts/)

[`catalyst.json`](https://olegzlobin.github.io/molecular-ts/#g1.H4sIAAAAAAAAA5VUa2_aMBT9L_fzHXLSktF8M4lDrSZ2Zpu2CEUWa6FDolAB09Qh_vtkJzzG6GMfYiX3HB-f-3A28GuxnD0mi_lk-gTxBm45u7OFTBnEED4CQnk90DzxoRxiWL0sp_MnQKBGFlbRlPc1xG2Egt5bLgxTNDFcij0UEFKDORc3-2jUBDOpEgYxaQVthJ6it9wM6qAt-rnhZc6ZcniEcCdVntqGBDFB8JLn2ISEbYSu7IuEnSeENZzq83CAwAVThtP8BLqKEHTJWOqzLnM66NLkxjahAEHzosx5xllqj4o5Gc1WYwTDipIpavrq9MgAIWUJHVhd5txoe8tymdSJti4QEiky3rNh6ppUO3dvBRe2lJq7kkM8JEiqurBHwbBNCLql2rqsuEvK7XUd1DaRfWEgDonv0__Jbfe-Lj70dU7qKyHYPO95C97w9qGkM7h-fRmvDvOdyFwqDfFweNXBICIYXlxWOAwvOxiGHbwKqwpB0II5DlBA6EKFkCn2rc9Ewn08QDciFcJunIcBBt6LPnzsB3VY19GvVTO0XU71MfKFtIIdWEtEFYIZlKy-N3eM966N3xI6dX_GMaNRc1CEkYO6UqS2VCxjigl3yc75yJnomWtXzlYHSauzi2vDs0wwvcu286-gzWhipHK6dcaNp7--DnrKn_TZTUZRoTOpClr3dQPELQHEgWuqvym6iWzgx2g2yaeTsb9_64X_N6zGD4v542j5CvH852yGsFqPvk9n09_j5coldTQd-vX5ebxeTh8OY7L7FRXUKH5v9aAomFE8gXi9_Dk-auL7DN-ejxl1d98knhb-s7y61u-ff9KYN8jb7R95LDDbKQYAAA): type B catalyzes A→B; B decays back to A unless neighboring B stabilize it.

[![catalyst.json](docs/catalyst.webp)](https://olegzlobin.github.io/molecular-ts/#g1.H4sIAAAAAAAAA5VUa2_aMBT9L_fzHXLSktF8M4lDrSZ2Zpu2CEUWa6FDolAB09Qh_vtkJzzG6GMfYiX3HB-f-3A28GuxnD0mi_lk-gTxBm45u7OFTBnEED4CQnk90DzxoRxiWL0sp_MnQKBGFlbRlPc1xG2Egt5bLgxTNDFcij0UEFKDORc3-2jUBDOpEgYxaQVthJ6it9wM6qAt-rnhZc6ZcniEcCdVntqGBDFB8JLn2ISEbYSu7IuEnSeENZzq83CAwAVThtP8BLqKEHTJWOqzLnM66NLkxjahAEHzosx5xllqj4o5Gc1WYwTDipIpavrq9MgAIWUJHVhd5txoe8tymdSJti4QEiky3rNh6ppUO3dvBRe2lJq7kkM8JEiqurBHwbBNCLql2rqsuEvK7XUd1DaRfWEgDonv0__Jbfe-Lj70dU7qKyHYPO95C97w9qGkM7h-fRmvDvOdyFwqDfFweNXBICIYXlxWOAwvOxiGHbwKqwpB0II5DlBA6EKFkCn2rc9Ewn08QDciFcJunIcBBt6LPnzsB3VY19GvVTO0XU71MfKFtIIdWEtEFYIZlKy-N3eM966N3xI6dX_GMaNRc1CEkYO6UqS2VCxjigl3yc75yJnomWtXzlYHSauzi2vDs0wwvcu286-gzWhipHK6dcaNp7--DnrKn_TZTUZRoTOpClr3dQPELQHEgWuqvym6iWzgx2g2yaeTsb9_64X_N6zGD4v542j5CvH852yGsFqPvk9n09_j5coldTQd-vX5ebxeTh8OY7L7FRXUKH5v9aAomFE8gXi9_Dk-auL7DN-ejxl1d98knhb-s7y61u-ff9KYN8jb7R95LDDbKQYAAA)

[`rock-paper-scissors.json`](https://olegzlobin.github.io/molecular-ts/#g1.H4sIAAAAAAAAA7VUUU_bMBD-L_d8INtVgObNTZxikcSZ7QJVFFkICqoGFLVME6r63ycnaShZodukPcSO7z77vrv77DX8XCwf76LF8_38AcI1XEpx5TIVCwiB3QFCcT41MqpNKYSwelnOnx8AgVuVOc1jOTEQBggZv3Yyt0LzyEqVdy5KSONMZX7RWU9aY6J0JCAkxzRAGGt-Ke20MbpsklpZpFJo7z9BuFI6jV0L8jZCAoT62H07CGEBwkhN8kjsB7DGHZv9boogc6Gt5GnPNTxBMIUQcZ15kfLpiEcXrjVRBCOzIpWJFLHbKej9zeNqhmBFVgjN7UT3Q1KEWER86kyRSmvcpUhV1CY7QIhUnsixY7FvVMPc_2Uyd4Uy0pcdwpIgqZri7hhZQAj6odr4rKRPyu_1XTQuUpPcQshI3au_O27T8Roc5LXvqFNCsP2-4kY_4XbwSE_w9e1ltnrXeKRSpQ2EZRkMkA4YMnZWYUmHDOmQIj3zKzYgODxFUlUIOc-Ex4Ne3H73d-LmZbYEBHM7X60WyxVUCIkW3yYij2SNpEiRVghbvXeGjJvdZafmsjwK8IgSpMRTIdgsKywbIx4Fnkmt9pHkNfs2_d7conaj2Gkhmvt3JeT43Na7WeMsKbJ2psiqXXQbZAsjHawOMlJ57AotEqFF7i_xAUIuFfnYnvu2HQ-w_bY-Y2WS5OJDbXoBXMIjq7SPs4X05gr_wfPOQNf8_l8Yq3luEqUz3uh0DcQPFEK6QT-tgUHINuin2km8eOsXwV-oTsnm7elp9rqc375Levt0Ztxqee3MNMuE1TLqHp1OOAcgdfN_h7wuf3xANDr6FNhv3Z_imtp_Hb_XqE_Am80v1wLil9sGAAA): Rock, Paper, and Scissors convert in a cycle on contact.

[![rock-paper-scissors.json](docs/rock-paper-scissors.webp)](https://olegzlobin.github.io/molecular-ts/#g1.H4sIAAAAAAAAA7VUUU_bMBD-L_d8INtVgObNTZxikcSZ7QJVFFkICqoGFLVME6r63ycnaShZodukPcSO7z77vrv77DX8XCwf76LF8_38AcI1XEpx5TIVCwiB3QFCcT41MqpNKYSwelnOnx8AgVuVOc1jOTEQBggZv3Yyt0LzyEqVdy5KSONMZX7RWU9aY6J0JCAkxzRAGGt-Ke20MbpsklpZpFJo7z9BuFI6jV0L8jZCAoT62H07CGEBwkhN8kjsB7DGHZv9boogc6Gt5GnPNTxBMIUQcZ15kfLpiEcXrjVRBCOzIpWJFLHbKej9zeNqhmBFVgjN7UT3Q1KEWER86kyRSmvcpUhV1CY7QIhUnsixY7FvVMPc_2Uyd4Uy0pcdwpIgqZri7hhZQAj6odr4rKRPyu_1XTQuUpPcQshI3au_O27T8Roc5LXvqFNCsP2-4kY_4XbwSE_w9e1ltnrXeKRSpQ2EZRkMkA4YMnZWYUmHDOmQIj3zKzYgODxFUlUIOc-Ex4Ne3H73d-LmZbYEBHM7X60WyxVUCIkW3yYij2SNpEiRVghbvXeGjJvdZafmsjwK8IgSpMRTIdgsKywbIx4Fnkmt9pHkNfs2_d7conaj2Gkhmvt3JeT43Na7WeMsKbJ2psiqXXQbZAsjHawOMlJ57AotEqFF7i_xAUIuFfnYnvu2HQ-w_bY-Y2WS5OJDbXoBXMIjq7SPs4X05gr_wfPOQNf8_l8Yq3luEqUz3uh0DcQPFEK6QT-tgUHINuin2km8eOsXwV-oTsnm7elp9rqc375Levt0Ztxqee3MNMuE1TLqHp1OOAcgdfN_h7wuf3xANDr6FNhv3Z_imtp_Hb_XqE_Am80v1wLil9sGAAA)

## Controls
### 3D
* `↑`, `↓`, `←`, `→` — move forward, backward, left, right.
* Rotations are done by dragging.

### 2D
* `Wheel` — move up and down.
* `Shift + Wheel` — move left and right.
* `Ctrl + Wheel` — zoom.
* `Mouse down + Mouse move` — move arbitrarily.
* `Ctrl + Mouse down + Mouse move` (on a particle) — drag it arbitrarily.

### Adding new particles
* `Numeric key down + Click` — add a particle with the type corresponding to the number of the key.
* `1 + click` — add a particle of the first type.
* `2 + click` — add a particle of the second type.
* ...

## Research

Play with the simulation hyperparameters in the [live demo](https://smoren.github.io/molecular-ts/) and share links
to interesting worlds obtained in the app in the [special issue](https://github.com/Smoren/molecular-ts/issues/1).

Worlds can be imported and exported as configuration and state files.

## Install

```bash
npm i
npm run dev
```

## Inspiration

This project was inspired by the [ParticleAutomataJS](https://github.com/artemonigiri/ParticleAutomataJS)
developed by [ArtemOnigiri](https://github.com/artemonigiri).

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request on the
[GitHub repository](https://github.com/Smoren/molecular-ts). New UI translations can be added
in `src/web/i18n/locales.ts` and registered in `builtInLocales`.

## License

MolecuLarva is licensed under the MIT License.
