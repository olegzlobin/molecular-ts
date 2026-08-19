# MolecuLarva — молекулярная симуляция

[English](README.md) | **Русский**

Этот проект — эксперимент, визуализирующий поведение частиц
в двумерном и трёхмерном пространстве:

* Столкновения и отскоки частиц при контакте.
* Симуляция сил притяжения и отталкивания между частицами.
* Построение связей между частицами и влияние других частиц на эти связи.
* Трансформации типов частиц при создании связи, включая слияние двух частиц в одну.
* Спонтанный распад, разделение или исчезновение частиц со временем.
* Влияние температуры и других факторов среды на поведение частиц.

Частицы разных типов визуализируются разными цветами. Их свойства, представленные в конфигурации мира, зависят от типа частицы:

1. **Матрица коэффициентов гравитации** показывает, будет ли частица одного типа притягивать или отталкивать частицу другого типа в случае, когда они не связаны друг с другом, и с какой силой.
2. **Матрица смещения связей** показывает, будет ли частица одного типа притягивать или отталкивать частицу другого типа вдоль связи в случае, когда они уже связаны друг с другом, и с какой силой.
3. **Карта ограничения связей** показывает максимальное суммарное число связей для частиц каждого типа.
4. **Матрица весов связей** показывает вес, который занимает связь между частицей типа A и частицей типа B в общем ограничении на число связей частицы типа A (в карте ограничения связей). Максимальное число партнёров каждого типа выводится из этого веса и ограничения связей.
5. **Матрица предпочтения связей** показывает, каким связям частица отдаёт предпочтение. Когда ограничение связей уже достигнуто, новая связь может заменить более слабую существующую, если её предпочтение строго выше.
6. **Карта длины связей** и **карта жёсткости связей** показывают предпочтительную длину и упругую силу связей для частиц каждого типа. Для связи между двумя типами эти значения усредняются.
7. **Тензор влияния на предпочтение связей соседей** показывает, как частицы типа A, будучи связанными с B или C, влияют на предпочтение связи между частицами типа B и типа C.
8. **Тензор влияния на прочность связей соседей** показывает, как частицы типа A, будучи связанными с B или C, влияют на упругую силу и максимальную длину связи между частицами типа B и типа C.
9. **Трансформации** показывают, как частица типа A меняет свой тип при создании связи с частицей типа B, или как A и B сливаются в новый тип при контакте.
10. **Правила распада** показывают, как частица данного типа может измениться, разделиться или исчезнуть со временем, и какие соседние типы стабилизируют её против распада.

У каждого типа также есть собственное имя, цвет, радиус, масса и частота в начальном распределении частиц.

Основная цель проекта — исследование самоорганизующихся систем и поиск конфигураций, в которых будут присутствовать условия для
спонтанного возникновения искусственной жизни.

## Демо

[Дефолтный конфиг типов](https://olegzlobin.github.io/molecular-ts/) (C, H, O, N): частицы образуют связи и небольшие молекулы.

[![Дефолтный конфиг](docs/default-config.webp)](https://olegzlobin.github.io/molecular-ts/)

[`catalyst.json`](https://olegzlobin.github.io/molecular-ts/#g1.H4sIAAAAAAAAA5VUa2_aMBT9L_fzHXLSktF8M4lDrSZ2Zpu2CEUWa6FDolAB09Qh_vtkJzzG6GMfYiX3HB-f-3A28GuxnD0mi_lk-gTxBm45u7OFTBnEED4CQnk90DzxoRxiWL0sp_MnQKBGFlbRlPc1xG2Egt5bLgxTNDFcij0UEFKDORc3-2jUBDOpEgYxaQVthJ6it9wM6qAt-rnhZc6ZcniEcCdVntqGBDFB8JLn2ISEbYSu7IuEnSeENZzq83CAwAVThtP8BLqKEHTJWOqzLnM66NLkxjahAEHzosx5xllqj4o5Gc1WYwTDipIpavrq9MgAIWUJHVhd5txoe8tymdSJti4QEiky3rNh6ppUO3dvBRe2lJq7kkM8JEiqurBHwbBNCLql2rqsuEvK7XUd1DaRfWEgDonv0__Jbfe-Lj70dU7qKyHYPO95C97w9qGkM7h-fRmvDvOdyFwqDfFweNXBICIYXlxWOAwvOxiGHbwKqwpB0II5DlBA6EKFkCn2rc9Ewn08QDciFcJunIcBBt6LPnzsB3VY19GvVTO0XU71MfKFtIIdWEtEFYIZlKy-N3eM966N3xI6dX_GMaNRc1CEkYO6UqS2VCxjigl3yc75yJnomWtXzlYHSauzi2vDs0wwvcu286-gzWhipHK6dcaNp7--DnrKn_TZTUZRoTOpClr3dQPELQHEgWuqvym6iWzgx2g2yaeTsb9_64X_N6zGD4v542j5CvH852yGsFqPvk9n09_j5coldTQd-vX5ebxeTh8OY7L7FRXUKH5v9aAomFE8gXi9_Dk-auL7DN-ejxl1d98knhb-s7y61u-ff9KYN8jb7R95LDDbKQYAAA): тип B катализирует превращение A→B; B распадается обратно в A, если его не стабилизируют соседние B.

[![catalyst.json](docs/catalyst.webp)](https://olegzlobin.github.io/molecular-ts/#g1.H4sIAAAAAAAAA5VUa2_aMBT9L_fzHXLSktF8M4lDrSZ2Zpu2CEUWa6FDolAB09Qh_vtkJzzG6GMfYiX3HB-f-3A28GuxnD0mi_lk-gTxBm45u7OFTBnEED4CQnk90DzxoRxiWL0sp_MnQKBGFlbRlPc1xG2Egt5bLgxTNDFcij0UEFKDORc3-2jUBDOpEgYxaQVthJ6it9wM6qAt-rnhZc6ZcniEcCdVntqGBDFB8JLn2ISEbYSu7IuEnSeENZzq83CAwAVThtP8BLqKEHTJWOqzLnM66NLkxjahAEHzosx5xllqj4o5Gc1WYwTDipIpavrq9MgAIWUJHVhd5txoe8tymdSJti4QEiky3rNh6ppUO3dvBRe2lJq7kkM8JEiqurBHwbBNCLql2rqsuEvK7XUd1DaRfWEgDonv0__Jbfe-Lj70dU7qKyHYPO95C97w9qGkM7h-fRmvDvOdyFwqDfFweNXBICIYXlxWOAwvOxiGHbwKqwpB0II5DlBA6EKFkCn2rc9Ewn08QDciFcJunIcBBt6LPnzsB3VY19GvVTO0XU71MfKFtIIdWEtEFYIZlKy-N3eM966N3xI6dX_GMaNRc1CEkYO6UqS2VCxjigl3yc75yJnomWtXzlYHSauzi2vDs0wwvcu286-gzWhipHK6dcaNp7--DnrKn_TZTUZRoTOpClr3dQPELQHEgWuqvym6iWzgx2g2yaeTsb9_64X_N6zGD4v542j5CvH852yGsFqPvk9n09_j5coldTQd-vX5ebxeTh8OY7L7FRXUKH5v9aAomFE8gXi9_Dk-auL7DN-ejxl1d98knhb-s7y61u-ff9KYN8jb7R95LDDbKQYAAA)

## Управление
### 3D
* `↑`, `↓`, `←`, `→` — движение вперёд, назад, влево, вправо.
* Вращение выполняется перетаскиванием.

### 2D
* `Wheel` — движение вверх и вниз.
* `Shift + Wheel` — движение влево и вправо.
* `Ctrl + Wheel` — масштаб.
* `Mouse down + Mouse move` — свободное перемещение.
* `Ctrl + Mouse down + Mouse move` (на частице) — свободное перетаскивание частицы.

### Добавление новых частиц
* `Numeric key down + Click` — добавить частицу типа, соответствующего номеру клавиши.
* `1 + click` — добавить частицу первого типа.
* `2 + click` — добавить частицу второго типа.
* ...

## Исследования

Играйте с гиперпараметрами симуляции в [живом демо](https://smoren.github.io/molecular-ts/) и делитесь ссылками
на интересные миры, полученные в приложении, в [специальном issue](https://github.com/Smoren/molecular-ts/issues/1).

Миры можно импортировать и экспортировать как файлы конфигурации и состояния.

## Установка

```bash
npm i
npm run dev
```

## Вдохновение

Проект вдохновлён [ParticleAutomataJS](https://github.com/artemonigiri/ParticleAutomataJS)
разработчика [ArtemOnigiri](https://github.com/artemonigiri).

## Участие

Приветствуются любые вклады! Можно открыть issue или отправить pull request в
[репозиторий на GitHub](https://github.com/Smoren/molecular-ts). Новые переводы интерфейса
добавляются в `src/web/i18n/locales.ts` и регистрируются в `builtInLocales`.

## Лицензия

MolecuLarva распространяется по лицензии MIT.
