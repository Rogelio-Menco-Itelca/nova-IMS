-- Seed departamentos y municipios (generado por scripts/generate-colombia-geo-seed.js)
SET NAMES utf8mb4;

INSERT IGNORE INTO departments (dane_code, name) VALUES
('00', 'Amazonas'),
('01', 'Antioquia'),
('02', 'Arauca'),
('03', 'Atlántico'),
('04', 'Bolívar'),
('05', 'Boyacá'),
('06', 'Caldas'),
('07', 'Caquetá'),
('08', 'Casanare'),
('09', 'Cauca'),
('10', 'Cesar'),
('11', 'Chocó'),
('12', 'Cundinamarca'),
('13', 'Córdoba'),
('14', 'Guainía'),
('15', 'Guaviare'),
('16', 'Huila'),
('17', 'La Guajira'),
('18', 'Magdalena'),
('19', 'Meta'),
('20', 'Nariño'),
('21', 'Norte de Santander'),
('22', 'Putumayo'),
('23', 'Quindío'),
('24', 'Risaralda'),
('25', 'San Andrés y Providencia'),
('26', 'Santander'),
('27', 'Sucre'),
('28', 'Tolima'),
('29', 'Valle del Cauca'),
('30', 'Vaupés'),
('31', 'Vichada');

INSERT IGNORE INTO municipalities (department_id, dane_code, name)
SELECT d.id, v.dane_code, v.name
FROM (
  SELECT '00' AS dept_dane, '00001' AS dane_code, 'Leticia' AS name UNION ALL
  SELECT '00' AS dept_dane, '00002' AS dane_code, 'Puerto Nariño' AS name UNION ALL
  SELECT '01' AS dept_dane, '01001' AS dane_code, 'Abejorral' AS name UNION ALL
  SELECT '01' AS dept_dane, '01002' AS dane_code, 'Abriaquí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01003' AS dane_code, 'Alejandría' AS name UNION ALL
  SELECT '01' AS dept_dane, '01004' AS dane_code, 'Amagá' AS name UNION ALL
  SELECT '01' AS dept_dane, '01005' AS dane_code, 'Amalfi' AS name UNION ALL
  SELECT '01' AS dept_dane, '01006' AS dane_code, 'Andes' AS name UNION ALL
  SELECT '01' AS dept_dane, '01007' AS dane_code, 'Angelópolis' AS name UNION ALL
  SELECT '01' AS dept_dane, '01008' AS dane_code, 'Angostura' AS name UNION ALL
  SELECT '01' AS dept_dane, '01009' AS dane_code, 'Anorí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01010' AS dane_code, 'Anzá' AS name UNION ALL
  SELECT '01' AS dept_dane, '01011' AS dane_code, 'Apartadó' AS name UNION ALL
  SELECT '01' AS dept_dane, '01012' AS dane_code, 'Arboletes' AS name UNION ALL
  SELECT '01' AS dept_dane, '01013' AS dane_code, 'Argelia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01014' AS dane_code, 'Armenia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01015' AS dane_code, 'Barbosa' AS name UNION ALL
  SELECT '01' AS dept_dane, '01016' AS dane_code, 'Bello' AS name UNION ALL
  SELECT '01' AS dept_dane, '01017' AS dane_code, 'Belmira' AS name UNION ALL
  SELECT '01' AS dept_dane, '01018' AS dane_code, 'Betania' AS name UNION ALL
  SELECT '01' AS dept_dane, '01019' AS dane_code, 'Betulia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01020' AS dane_code, 'Briceño' AS name UNION ALL
  SELECT '01' AS dept_dane, '01021' AS dane_code, 'Buriticá' AS name UNION ALL
  SELECT '01' AS dept_dane, '01022' AS dane_code, 'Cáceres' AS name UNION ALL
  SELECT '01' AS dept_dane, '01023' AS dane_code, 'Caicedo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01024' AS dane_code, 'Caldas' AS name UNION ALL
  SELECT '01' AS dept_dane, '01025' AS dane_code, 'Campamento' AS name UNION ALL
  SELECT '01' AS dept_dane, '01026' AS dane_code, 'Cañasgordas' AS name UNION ALL
  SELECT '01' AS dept_dane, '01027' AS dane_code, 'Caracolí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01028' AS dane_code, 'Caramanta' AS name UNION ALL
  SELECT '01' AS dept_dane, '01029' AS dane_code, 'Carepa' AS name UNION ALL
  SELECT '01' AS dept_dane, '01030' AS dane_code, 'Carolina del Príncipe' AS name UNION ALL
  SELECT '01' AS dept_dane, '01031' AS dane_code, 'Caucasia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01032' AS dane_code, 'Chigorodó' AS name UNION ALL
  SELECT '01' AS dept_dane, '01033' AS dane_code, 'Cisneros' AS name UNION ALL
  SELECT '01' AS dept_dane, '01034' AS dane_code, 'Ciudad Bolívar' AS name UNION ALL
  SELECT '01' AS dept_dane, '01035' AS dane_code, 'Cocorná' AS name UNION ALL
  SELECT '01' AS dept_dane, '01036' AS dane_code, 'Concepción' AS name UNION ALL
  SELECT '01' AS dept_dane, '01037' AS dane_code, 'Concordia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01038' AS dane_code, 'Copacabana' AS name UNION ALL
  SELECT '01' AS dept_dane, '01039' AS dane_code, 'Dabeiba' AS name UNION ALL
  SELECT '01' AS dept_dane, '01040' AS dane_code, 'Donmatías' AS name UNION ALL
  SELECT '01' AS dept_dane, '01041' AS dane_code, 'Ebéjico' AS name UNION ALL
  SELECT '01' AS dept_dane, '01042' AS dane_code, 'El Bagre' AS name UNION ALL
  SELECT '01' AS dept_dane, '01043' AS dane_code, 'El Carmen de Viboral' AS name UNION ALL
  SELECT '01' AS dept_dane, '01044' AS dane_code, 'El Peñol' AS name UNION ALL
  SELECT '01' AS dept_dane, '01045' AS dane_code, 'El Retiro' AS name UNION ALL
  SELECT '01' AS dept_dane, '01046' AS dane_code, 'El Santuario' AS name UNION ALL
  SELECT '01' AS dept_dane, '01047' AS dane_code, 'Entrerríos' AS name UNION ALL
  SELECT '01' AS dept_dane, '01048' AS dane_code, 'Envigado' AS name UNION ALL
  SELECT '01' AS dept_dane, '01049' AS dane_code, 'Fredonia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01050' AS dane_code, 'Frontino' AS name UNION ALL
  SELECT '01' AS dept_dane, '01051' AS dane_code, 'Giraldo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01052' AS dane_code, 'Girardota' AS name UNION ALL
  SELECT '01' AS dept_dane, '01053' AS dane_code, 'Gómez Plata' AS name UNION ALL
  SELECT '01' AS dept_dane, '01054' AS dane_code, 'Granada' AS name UNION ALL
  SELECT '01' AS dept_dane, '01055' AS dane_code, 'Guadalupe' AS name UNION ALL
  SELECT '01' AS dept_dane, '01056' AS dane_code, 'Guarne' AS name UNION ALL
  SELECT '01' AS dept_dane, '01057' AS dane_code, 'Guatapé' AS name UNION ALL
  SELECT '01' AS dept_dane, '01058' AS dane_code, 'Heliconia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01059' AS dane_code, 'Hispania' AS name UNION ALL
  SELECT '01' AS dept_dane, '01060' AS dane_code, 'Itagüí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01061' AS dane_code, 'Ituango' AS name UNION ALL
  SELECT '01' AS dept_dane, '01062' AS dane_code, 'Jardín' AS name UNION ALL
  SELECT '01' AS dept_dane, '01063' AS dane_code, 'Jericó' AS name UNION ALL
  SELECT '01' AS dept_dane, '01064' AS dane_code, 'La Ceja' AS name UNION ALL
  SELECT '01' AS dept_dane, '01065' AS dane_code, 'La Estrella' AS name UNION ALL
  SELECT '01' AS dept_dane, '01066' AS dane_code, 'La Pintada' AS name UNION ALL
  SELECT '01' AS dept_dane, '01067' AS dane_code, 'La Unión' AS name UNION ALL
  SELECT '01' AS dept_dane, '01068' AS dane_code, 'Liborina' AS name UNION ALL
  SELECT '01' AS dept_dane, '01069' AS dane_code, 'Maceo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01070' AS dane_code, 'Marinilla' AS name UNION ALL
  SELECT '01' AS dept_dane, '01071' AS dane_code, 'Medellín' AS name UNION ALL
  SELECT '01' AS dept_dane, '01072' AS dane_code, 'Montebello' AS name UNION ALL
  SELECT '01' AS dept_dane, '01073' AS dane_code, 'Murindó' AS name UNION ALL
  SELECT '01' AS dept_dane, '01074' AS dane_code, 'Mutatá' AS name UNION ALL
  SELECT '01' AS dept_dane, '01075' AS dane_code, 'Nariño' AS name UNION ALL
  SELECT '01' AS dept_dane, '01076' AS dane_code, 'Nechí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01077' AS dane_code, 'Necoclí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01078' AS dane_code, 'Olaya' AS name UNION ALL
  SELECT '01' AS dept_dane, '01079' AS dane_code, 'Peque' AS name UNION ALL
  SELECT '01' AS dept_dane, '01080' AS dane_code, 'Pueblorrico' AS name UNION ALL
  SELECT '01' AS dept_dane, '01081' AS dane_code, 'Puerto Berrío' AS name UNION ALL
  SELECT '01' AS dept_dane, '01082' AS dane_code, 'Puerto Nare' AS name UNION ALL
  SELECT '01' AS dept_dane, '01083' AS dane_code, 'Puerto Triunfo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01084' AS dane_code, 'Remedios' AS name UNION ALL
  SELECT '01' AS dept_dane, '01085' AS dane_code, 'Rionegro' AS name UNION ALL
  SELECT '01' AS dept_dane, '01086' AS dane_code, 'Sabanalarga' AS name UNION ALL
  SELECT '01' AS dept_dane, '01087' AS dane_code, 'Sabaneta' AS name UNION ALL
  SELECT '01' AS dept_dane, '01088' AS dane_code, 'Salgar' AS name UNION ALL
  SELECT '01' AS dept_dane, '01089' AS dane_code, 'San Andrés de Cuerquia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01090' AS dane_code, 'San Carlos' AS name UNION ALL
  SELECT '01' AS dept_dane, '01091' AS dane_code, 'San Francisco' AS name UNION ALL
  SELECT '01' AS dept_dane, '01092' AS dane_code, 'San Jerónimo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01093' AS dane_code, 'San José de la Montaña' AS name UNION ALL
  SELECT '01' AS dept_dane, '01094' AS dane_code, 'San Juan de Urabá' AS name UNION ALL
  SELECT '01' AS dept_dane, '01095' AS dane_code, 'San Luis' AS name UNION ALL
  SELECT '01' AS dept_dane, '01096' AS dane_code, 'San Pedro de Urabá' AS name UNION ALL
  SELECT '01' AS dept_dane, '01097' AS dane_code, 'San Pedro de los Milagros' AS name UNION ALL
  SELECT '01' AS dept_dane, '01098' AS dane_code, 'San Rafael' AS name UNION ALL
  SELECT '01' AS dept_dane, '01099' AS dane_code, 'San Roque' AS name UNION ALL
  SELECT '01' AS dept_dane, '01100' AS dane_code, 'San Vicente' AS name UNION ALL
  SELECT '01' AS dept_dane, '01101' AS dane_code, 'Santa Bárbara' AS name UNION ALL
  SELECT '01' AS dept_dane, '01102' AS dane_code, 'Santa Fe de Antioquia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01103' AS dane_code, 'Santa Rosa de Osos' AS name UNION ALL
  SELECT '01' AS dept_dane, '01104' AS dane_code, 'Santo Domingo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01105' AS dane_code, 'Segovia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01106' AS dane_code, 'Sonsón' AS name UNION ALL
  SELECT '01' AS dept_dane, '01107' AS dane_code, 'Sopetrán' AS name UNION ALL
  SELECT '01' AS dept_dane, '01108' AS dane_code, 'Támesis' AS name UNION ALL
  SELECT '01' AS dept_dane, '01109' AS dane_code, 'Tarazá' AS name UNION ALL
  SELECT '01' AS dept_dane, '01110' AS dane_code, 'Tarso' AS name UNION ALL
  SELECT '01' AS dept_dane, '01111' AS dane_code, 'Titiribí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01112' AS dane_code, 'Toledo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01113' AS dane_code, 'Turbo' AS name UNION ALL
  SELECT '01' AS dept_dane, '01114' AS dane_code, 'Uramita' AS name UNION ALL
  SELECT '01' AS dept_dane, '01115' AS dane_code, 'Urrao' AS name UNION ALL
  SELECT '01' AS dept_dane, '01116' AS dane_code, 'Valdivia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01117' AS dane_code, 'Valparaíso' AS name UNION ALL
  SELECT '01' AS dept_dane, '01118' AS dane_code, 'Vegachí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01119' AS dane_code, 'Venecia' AS name UNION ALL
  SELECT '01' AS dept_dane, '01120' AS dane_code, 'Vigía del Fuerte' AS name UNION ALL
  SELECT '01' AS dept_dane, '01121' AS dane_code, 'Yalí' AS name UNION ALL
  SELECT '01' AS dept_dane, '01122' AS dane_code, 'Yarumal' AS name UNION ALL
  SELECT '01' AS dept_dane, '01123' AS dane_code, 'Yolombó' AS name UNION ALL
  SELECT '01' AS dept_dane, '01124' AS dane_code, 'Yondó' AS name UNION ALL
  SELECT '01' AS dept_dane, '01125' AS dane_code, 'Zaragoza' AS name UNION ALL
  SELECT '02' AS dept_dane, '02001' AS dane_code, 'Arauca' AS name UNION ALL
  SELECT '02' AS dept_dane, '02002' AS dane_code, 'Arauquita' AS name UNION ALL
  SELECT '02' AS dept_dane, '02003' AS dane_code, 'Cravo Norte' AS name UNION ALL
  SELECT '02' AS dept_dane, '02004' AS dane_code, 'Fortul' AS name UNION ALL
  SELECT '02' AS dept_dane, '02005' AS dane_code, 'Puerto Rondón' AS name UNION ALL
  SELECT '02' AS dept_dane, '02006' AS dane_code, 'Saravena' AS name UNION ALL
  SELECT '02' AS dept_dane, '02007' AS dane_code, 'Tame' AS name UNION ALL
  SELECT '03' AS dept_dane, '03001' AS dane_code, 'Baranoa' AS name UNION ALL
  SELECT '03' AS dept_dane, '03002' AS dane_code, 'Barranquilla' AS name UNION ALL
  SELECT '03' AS dept_dane, '03003' AS dane_code, 'Campo de la Cruz' AS name UNION ALL
  SELECT '03' AS dept_dane, '03004' AS dane_code, 'Candelaria' AS name UNION ALL
  SELECT '03' AS dept_dane, '03005' AS dane_code, 'Galapa' AS name UNION ALL
  SELECT '03' AS dept_dane, '03006' AS dane_code, 'Juan de Acosta' AS name UNION ALL
  SELECT '03' AS dept_dane, '03007' AS dane_code, 'Luruaco' AS name UNION ALL
  SELECT '03' AS dept_dane, '03008' AS dane_code, 'Malambo' AS name UNION ALL
  SELECT '03' AS dept_dane, '03009' AS dane_code, 'Manatí' AS name UNION ALL
  SELECT '03' AS dept_dane, '03010' AS dane_code, 'Palmar de Varela' AS name UNION ALL
  SELECT '03' AS dept_dane, '03011' AS dane_code, 'Piojó' AS name UNION ALL
  SELECT '03' AS dept_dane, '03012' AS dane_code, 'Polonuevo' AS name UNION ALL
  SELECT '03' AS dept_dane, '03013' AS dane_code, 'Ponedera' AS name UNION ALL
  SELECT '03' AS dept_dane, '03014' AS dane_code, 'Puerto Colombia' AS name UNION ALL
  SELECT '03' AS dept_dane, '03015' AS dane_code, 'Repelón' AS name UNION ALL
  SELECT '03' AS dept_dane, '03016' AS dane_code, 'Sabanagrande' AS name UNION ALL
  SELECT '03' AS dept_dane, '03017' AS dane_code, 'Sabanalarga' AS name UNION ALL
  SELECT '03' AS dept_dane, '03018' AS dane_code, 'Santa Lucía' AS name UNION ALL
  SELECT '03' AS dept_dane, '03019' AS dane_code, 'Santo Tomás' AS name UNION ALL
  SELECT '03' AS dept_dane, '03020' AS dane_code, 'Soledad' AS name UNION ALL
  SELECT '03' AS dept_dane, '03021' AS dane_code, 'Suán' AS name UNION ALL
  SELECT '03' AS dept_dane, '03022' AS dane_code, 'Tubará' AS name UNION ALL
  SELECT '03' AS dept_dane, '03023' AS dane_code, 'Usiacurí' AS name UNION ALL
  SELECT '04' AS dept_dane, '04001' AS dane_code, 'Achí' AS name UNION ALL
  SELECT '04' AS dept_dane, '04002' AS dane_code, 'Altos del Rosario' AS name UNION ALL
  SELECT '04' AS dept_dane, '04003' AS dane_code, 'Arenal' AS name UNION ALL
  SELECT '04' AS dept_dane, '04004' AS dane_code, 'Arjona' AS name UNION ALL
  SELECT '04' AS dept_dane, '04005' AS dane_code, 'Arroyohondo' AS name UNION ALL
  SELECT '04' AS dept_dane, '04006' AS dane_code, 'Barranco de Loba' AS name UNION ALL
  SELECT '04' AS dept_dane, '04007' AS dane_code, 'Brazuelo de Papayal' AS name UNION ALL
  SELECT '04' AS dept_dane, '04008' AS dane_code, 'Calamar' AS name UNION ALL
  SELECT '04' AS dept_dane, '04009' AS dane_code, 'Cantagallo' AS name UNION ALL
  SELECT '04' AS dept_dane, '04010' AS dane_code, 'Cartagena de Indias' AS name UNION ALL
  SELECT '04' AS dept_dane, '04011' AS dane_code, 'Cicuco' AS name UNION ALL
  SELECT '04' AS dept_dane, '04012' AS dane_code, 'Clemencia' AS name UNION ALL
  SELECT '04' AS dept_dane, '04013' AS dane_code, 'Córdoba' AS name UNION ALL
  SELECT '04' AS dept_dane, '04014' AS dane_code, 'El Carmen de Bolívar' AS name UNION ALL
  SELECT '04' AS dept_dane, '04015' AS dane_code, 'El Guamo' AS name UNION ALL
  SELECT '04' AS dept_dane, '04016' AS dane_code, 'El Peñón' AS name UNION ALL
  SELECT '04' AS dept_dane, '04017' AS dane_code, 'Hatillo de Loba' AS name UNION ALL
  SELECT '04' AS dept_dane, '04018' AS dane_code, 'Magangué' AS name UNION ALL
  SELECT '04' AS dept_dane, '04019' AS dane_code, 'Mahates' AS name UNION ALL
  SELECT '04' AS dept_dane, '04020' AS dane_code, 'Margarita' AS name UNION ALL
  SELECT '04' AS dept_dane, '04021' AS dane_code, 'María la Baja' AS name UNION ALL
  SELECT '04' AS dept_dane, '04022' AS dane_code, 'Mompós' AS name UNION ALL
  SELECT '04' AS dept_dane, '04023' AS dane_code, 'Montecristo' AS name UNION ALL
  SELECT '04' AS dept_dane, '04024' AS dane_code, 'Morales' AS name UNION ALL
  SELECT '04' AS dept_dane, '04025' AS dane_code, 'Norosí' AS name UNION ALL
  SELECT '04' AS dept_dane, '04026' AS dane_code, 'Pinillos' AS name UNION ALL
  SELECT '04' AS dept_dane, '04027' AS dane_code, 'Regidor' AS name UNION ALL
  SELECT '04' AS dept_dane, '04028' AS dane_code, 'Río Viejo' AS name UNION ALL
  SELECT '04' AS dept_dane, '04029' AS dane_code, 'San Cristóbal' AS name UNION ALL
  SELECT '04' AS dept_dane, '04030' AS dane_code, 'San Estanislao' AS name UNION ALL
  SELECT '04' AS dept_dane, '04031' AS dane_code, 'San Fernando' AS name UNION ALL
  SELECT '04' AS dept_dane, '04032' AS dane_code, 'San Jacinto del Cauca' AS name UNION ALL
  SELECT '04' AS dept_dane, '04033' AS dane_code, 'San Jacinto' AS name UNION ALL
  SELECT '04' AS dept_dane, '04034' AS dane_code, 'San Juan Nepomuceno' AS name UNION ALL
  SELECT '04' AS dept_dane, '04035' AS dane_code, 'San Martín de Loba' AS name UNION ALL
  SELECT '04' AS dept_dane, '04036' AS dane_code, 'San Pablo' AS name UNION ALL
  SELECT '04' AS dept_dane, '04037' AS dane_code, 'Santa Catalina' AS name UNION ALL
  SELECT '04' AS dept_dane, '04038' AS dane_code, 'Santa Rosa' AS name UNION ALL
  SELECT '04' AS dept_dane, '04039' AS dane_code, 'Santa Rosa del Sur' AS name UNION ALL
  SELECT '04' AS dept_dane, '04040' AS dane_code, 'Simití' AS name UNION ALL
  SELECT '04' AS dept_dane, '04041' AS dane_code, 'Soplaviento' AS name UNION ALL
  SELECT '04' AS dept_dane, '04042' AS dane_code, 'Talaigua Nuevo' AS name UNION ALL
  SELECT '04' AS dept_dane, '04043' AS dane_code, 'Tiquisio' AS name UNION ALL
  SELECT '04' AS dept_dane, '04044' AS dane_code, 'Turbaco' AS name UNION ALL
  SELECT '04' AS dept_dane, '04045' AS dane_code, 'Turbaná' AS name UNION ALL
  SELECT '04' AS dept_dane, '04046' AS dane_code, 'Villanueva' AS name UNION ALL
  SELECT '04' AS dept_dane, '04047' AS dane_code, 'Zambrano' AS name UNION ALL
  SELECT '05' AS dept_dane, '05001' AS dane_code, 'Almeida' AS name UNION ALL
  SELECT '05' AS dept_dane, '05002' AS dane_code, 'Aquitania' AS name UNION ALL
  SELECT '05' AS dept_dane, '05003' AS dane_code, 'Arcabuco' AS name UNION ALL
  SELECT '05' AS dept_dane, '05004' AS dane_code, 'Belén' AS name UNION ALL
  SELECT '05' AS dept_dane, '05005' AS dane_code, 'Berbeo' AS name UNION ALL
  SELECT '05' AS dept_dane, '05006' AS dane_code, 'Betéitiva' AS name UNION ALL
  SELECT '05' AS dept_dane, '05007' AS dane_code, 'Boavita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05008' AS dane_code, 'Boyacá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05009' AS dane_code, 'Briceño' AS name UNION ALL
  SELECT '05' AS dept_dane, '05010' AS dane_code, 'Buenavista' AS name UNION ALL
  SELECT '05' AS dept_dane, '05011' AS dane_code, 'Busbanzá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05012' AS dane_code, 'Caldas' AS name UNION ALL
  SELECT '05' AS dept_dane, '05013' AS dane_code, 'Campohermoso' AS name UNION ALL
  SELECT '05' AS dept_dane, '05014' AS dane_code, 'Cerinza' AS name UNION ALL
  SELECT '05' AS dept_dane, '05015' AS dane_code, 'Chinavita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05016' AS dane_code, 'Chiquinquirá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05017' AS dane_code, 'Chíquiza' AS name UNION ALL
  SELECT '05' AS dept_dane, '05018' AS dane_code, 'Chiscas' AS name UNION ALL
  SELECT '05' AS dept_dane, '05019' AS dane_code, 'Chita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05020' AS dane_code, 'Chitaraque' AS name UNION ALL
  SELECT '05' AS dept_dane, '05021' AS dane_code, 'Chivatá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05022' AS dane_code, 'Chivor' AS name UNION ALL
  SELECT '05' AS dept_dane, '05023' AS dane_code, 'Ciénega' AS name UNION ALL
  SELECT '05' AS dept_dane, '05024' AS dane_code, 'Cómbita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05025' AS dane_code, 'Coper' AS name UNION ALL
  SELECT '05' AS dept_dane, '05026' AS dane_code, 'Corrales' AS name UNION ALL
  SELECT '05' AS dept_dane, '05027' AS dane_code, 'Covarachía' AS name UNION ALL
  SELECT '05' AS dept_dane, '05028' AS dane_code, 'Cubará' AS name UNION ALL
  SELECT '05' AS dept_dane, '05029' AS dane_code, 'Cucaita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05030' AS dane_code, 'Cuítiva' AS name UNION ALL
  SELECT '05' AS dept_dane, '05031' AS dane_code, 'Duitama' AS name UNION ALL
  SELECT '05' AS dept_dane, '05032' AS dane_code, 'El Cocuy' AS name UNION ALL
  SELECT '05' AS dept_dane, '05033' AS dane_code, 'El Espino' AS name UNION ALL
  SELECT '05' AS dept_dane, '05034' AS dane_code, 'Firavitoba' AS name UNION ALL
  SELECT '05' AS dept_dane, '05035' AS dane_code, 'Floresta' AS name UNION ALL
  SELECT '05' AS dept_dane, '05036' AS dane_code, 'Gachantivá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05037' AS dane_code, 'Gámeza' AS name UNION ALL
  SELECT '05' AS dept_dane, '05038' AS dane_code, 'Garagoa' AS name UNION ALL
  SELECT '05' AS dept_dane, '05039' AS dane_code, 'Guacamayas' AS name UNION ALL
  SELECT '05' AS dept_dane, '05040' AS dane_code, 'Guateque' AS name UNION ALL
  SELECT '05' AS dept_dane, '05041' AS dane_code, 'Guayatá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05042' AS dane_code, 'Güicán' AS name UNION ALL
  SELECT '05' AS dept_dane, '05043' AS dane_code, 'Iza' AS name UNION ALL
  SELECT '05' AS dept_dane, '05044' AS dane_code, 'Jenesano' AS name UNION ALL
  SELECT '05' AS dept_dane, '05045' AS dane_code, 'Jericó' AS name UNION ALL
  SELECT '05' AS dept_dane, '05046' AS dane_code, 'La Capilla' AS name UNION ALL
  SELECT '05' AS dept_dane, '05047' AS dane_code, 'La Uvita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05048' AS dane_code, 'La Victoria' AS name UNION ALL
  SELECT '05' AS dept_dane, '05049' AS dane_code, 'Labranzagrande' AS name UNION ALL
  SELECT '05' AS dept_dane, '05050' AS dane_code, 'Macanal' AS name UNION ALL
  SELECT '05' AS dept_dane, '05051' AS dane_code, 'Maripí' AS name UNION ALL
  SELECT '05' AS dept_dane, '05052' AS dane_code, 'Miraflores' AS name UNION ALL
  SELECT '05' AS dept_dane, '05053' AS dane_code, 'Mongua' AS name UNION ALL
  SELECT '05' AS dept_dane, '05054' AS dane_code, 'Monguí' AS name UNION ALL
  SELECT '05' AS dept_dane, '05055' AS dane_code, 'Moniquirá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05056' AS dane_code, 'Motavita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05057' AS dane_code, 'Muzo' AS name UNION ALL
  SELECT '05' AS dept_dane, '05058' AS dane_code, 'Nobsa' AS name UNION ALL
  SELECT '05' AS dept_dane, '05059' AS dane_code, 'Nuevo Colón' AS name UNION ALL
  SELECT '05' AS dept_dane, '05060' AS dane_code, 'Oicatá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05061' AS dane_code, 'Otanche' AS name UNION ALL
  SELECT '05' AS dept_dane, '05062' AS dane_code, 'Pachavita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05063' AS dane_code, 'Páez' AS name UNION ALL
  SELECT '05' AS dept_dane, '05064' AS dane_code, 'Paipa' AS name UNION ALL
  SELECT '05' AS dept_dane, '05065' AS dane_code, 'Pajarito' AS name UNION ALL
  SELECT '05' AS dept_dane, '05066' AS dane_code, 'Panqueba' AS name UNION ALL
  SELECT '05' AS dept_dane, '05067' AS dane_code, 'Pauna' AS name UNION ALL
  SELECT '05' AS dept_dane, '05068' AS dane_code, 'Paya' AS name UNION ALL
  SELECT '05' AS dept_dane, '05069' AS dane_code, 'Paz del Río' AS name UNION ALL
  SELECT '05' AS dept_dane, '05070' AS dane_code, 'Pesca' AS name UNION ALL
  SELECT '05' AS dept_dane, '05071' AS dane_code, 'Pisba' AS name UNION ALL
  SELECT '05' AS dept_dane, '05072' AS dane_code, 'Puerto Boyacá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05073' AS dane_code, 'Quípama' AS name UNION ALL
  SELECT '05' AS dept_dane, '05074' AS dane_code, 'Ramiriquí' AS name UNION ALL
  SELECT '05' AS dept_dane, '05075' AS dane_code, 'Ráquira' AS name UNION ALL
  SELECT '05' AS dept_dane, '05076' AS dane_code, 'Rondón' AS name UNION ALL
  SELECT '05' AS dept_dane, '05077' AS dane_code, 'Saboyá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05078' AS dane_code, 'Sáchica' AS name UNION ALL
  SELECT '05' AS dept_dane, '05079' AS dane_code, 'Samacá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05080' AS dane_code, 'San Eduardo' AS name UNION ALL
  SELECT '05' AS dept_dane, '05081' AS dane_code, 'San José de Pare' AS name UNION ALL
  SELECT '05' AS dept_dane, '05082' AS dane_code, 'San Luis de Gaceno' AS name UNION ALL
  SELECT '05' AS dept_dane, '05083' AS dane_code, 'San Mateo' AS name UNION ALL
  SELECT '05' AS dept_dane, '05084' AS dane_code, 'San Miguel de Sema' AS name UNION ALL
  SELECT '05' AS dept_dane, '05085' AS dane_code, 'San Pablo de Borbur' AS name UNION ALL
  SELECT '05' AS dept_dane, '05086' AS dane_code, 'Santa María' AS name UNION ALL
  SELECT '05' AS dept_dane, '05087' AS dane_code, 'Santa Rosa de Viterbo' AS name UNION ALL
  SELECT '05' AS dept_dane, '05088' AS dane_code, 'Santa Sofía' AS name UNION ALL
  SELECT '05' AS dept_dane, '05089' AS dane_code, 'Santana' AS name UNION ALL
  SELECT '05' AS dept_dane, '05090' AS dane_code, 'Sativanorte' AS name UNION ALL
  SELECT '05' AS dept_dane, '05091' AS dane_code, 'Sativasur' AS name UNION ALL
  SELECT '05' AS dept_dane, '05092' AS dane_code, 'Siachoque' AS name UNION ALL
  SELECT '05' AS dept_dane, '05093' AS dane_code, 'Soatá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05094' AS dane_code, 'Socha' AS name UNION ALL
  SELECT '05' AS dept_dane, '05095' AS dane_code, 'Socotá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05096' AS dane_code, 'Sogamoso' AS name UNION ALL
  SELECT '05' AS dept_dane, '05097' AS dane_code, 'Somondoco' AS name UNION ALL
  SELECT '05' AS dept_dane, '05098' AS dane_code, 'Sora' AS name UNION ALL
  SELECT '05' AS dept_dane, '05099' AS dane_code, 'Soracá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05100' AS dane_code, 'Sotaquirá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05101' AS dane_code, 'Susacón' AS name UNION ALL
  SELECT '05' AS dept_dane, '05102' AS dane_code, 'Sutamarchán' AS name UNION ALL
  SELECT '05' AS dept_dane, '05103' AS dane_code, 'Sutatenza' AS name UNION ALL
  SELECT '05' AS dept_dane, '05104' AS dane_code, 'Tasco' AS name UNION ALL
  SELECT '05' AS dept_dane, '05105' AS dane_code, 'Tenza' AS name UNION ALL
  SELECT '05' AS dept_dane, '05106' AS dane_code, 'Tibaná' AS name UNION ALL
  SELECT '05' AS dept_dane, '05107' AS dane_code, 'Tibasosa' AS name UNION ALL
  SELECT '05' AS dept_dane, '05108' AS dane_code, 'Tinjacá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05109' AS dane_code, 'Tipacoque' AS name UNION ALL
  SELECT '05' AS dept_dane, '05110' AS dane_code, 'Toca' AS name UNION ALL
  SELECT '05' AS dept_dane, '05111' AS dane_code, 'Togüí' AS name UNION ALL
  SELECT '05' AS dept_dane, '05112' AS dane_code, 'Tópaga' AS name UNION ALL
  SELECT '05' AS dept_dane, '05113' AS dane_code, 'Tota' AS name UNION ALL
  SELECT '05' AS dept_dane, '05114' AS dane_code, 'Tunja' AS name UNION ALL
  SELECT '05' AS dept_dane, '05115' AS dane_code, 'Tununguá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05116' AS dane_code, 'Turmequé' AS name UNION ALL
  SELECT '05' AS dept_dane, '05117' AS dane_code, 'Tuta' AS name UNION ALL
  SELECT '05' AS dept_dane, '05118' AS dane_code, 'Tutazá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05119' AS dane_code, 'Úmbita' AS name UNION ALL
  SELECT '05' AS dept_dane, '05120' AS dane_code, 'Ventaquemada' AS name UNION ALL
  SELECT '05' AS dept_dane, '05121' AS dane_code, 'Villa de Leyva' AS name UNION ALL
  SELECT '05' AS dept_dane, '05122' AS dane_code, 'Viracachá' AS name UNION ALL
  SELECT '05' AS dept_dane, '05123' AS dane_code, 'Zetaquira' AS name UNION ALL
  SELECT '06' AS dept_dane, '06001' AS dane_code, 'Aguadas' AS name UNION ALL
  SELECT '06' AS dept_dane, '06002' AS dane_code, 'Anserma' AS name UNION ALL
  SELECT '06' AS dept_dane, '06003' AS dane_code, 'Aranzazu' AS name UNION ALL
  SELECT '06' AS dept_dane, '06004' AS dane_code, 'Belalcázar' AS name UNION ALL
  SELECT '06' AS dept_dane, '06005' AS dane_code, 'Chinchiná' AS name UNION ALL
  SELECT '06' AS dept_dane, '06006' AS dane_code, 'Filadelfia' AS name UNION ALL
  SELECT '06' AS dept_dane, '06007' AS dane_code, 'La Dorada' AS name UNION ALL
  SELECT '06' AS dept_dane, '06008' AS dane_code, 'La Merced' AS name UNION ALL
  SELECT '06' AS dept_dane, '06009' AS dane_code, 'Manizales' AS name UNION ALL
  SELECT '06' AS dept_dane, '06010' AS dane_code, 'Manzanares' AS name UNION ALL
  SELECT '06' AS dept_dane, '06011' AS dane_code, 'Marmato' AS name UNION ALL
  SELECT '06' AS dept_dane, '06012' AS dane_code, 'Marquetalia' AS name UNION ALL
  SELECT '06' AS dept_dane, '06013' AS dane_code, 'Marulanda' AS name UNION ALL
  SELECT '06' AS dept_dane, '06014' AS dane_code, 'Neira' AS name UNION ALL
  SELECT '06' AS dept_dane, '06015' AS dane_code, 'Norcasia' AS name UNION ALL
  SELECT '06' AS dept_dane, '06016' AS dane_code, 'Pácora' AS name UNION ALL
  SELECT '06' AS dept_dane, '06017' AS dane_code, 'Palestina' AS name UNION ALL
  SELECT '06' AS dept_dane, '06018' AS dane_code, 'Pensilvania' AS name UNION ALL
  SELECT '06' AS dept_dane, '06019' AS dane_code, 'Riosucio' AS name UNION ALL
  SELECT '06' AS dept_dane, '06020' AS dane_code, 'Risaralda' AS name UNION ALL
  SELECT '06' AS dept_dane, '06021' AS dane_code, 'Salamina' AS name UNION ALL
  SELECT '06' AS dept_dane, '06022' AS dane_code, 'Samaná' AS name UNION ALL
  SELECT '06' AS dept_dane, '06023' AS dane_code, 'San José' AS name UNION ALL
  SELECT '06' AS dept_dane, '06024' AS dane_code, 'Supía' AS name UNION ALL
  SELECT '06' AS dept_dane, '06025' AS dane_code, 'Victoria' AS name UNION ALL
  SELECT '06' AS dept_dane, '06026' AS dane_code, 'Villamaría' AS name UNION ALL
  SELECT '06' AS dept_dane, '06027' AS dane_code, 'Viterbo' AS name UNION ALL
  SELECT '07' AS dept_dane, '07001' AS dane_code, 'Albania' AS name UNION ALL
  SELECT '07' AS dept_dane, '07002' AS dane_code, 'Belén de los Andaquíes' AS name UNION ALL
  SELECT '07' AS dept_dane, '07003' AS dane_code, 'Cartagena del Chairá' AS name UNION ALL
  SELECT '07' AS dept_dane, '07004' AS dane_code, 'Curillo' AS name UNION ALL
  SELECT '07' AS dept_dane, '07005' AS dane_code, 'El Doncello' AS name UNION ALL
  SELECT '07' AS dept_dane, '07006' AS dane_code, 'El Paujil' AS name UNION ALL
  SELECT '07' AS dept_dane, '07007' AS dane_code, 'Florencia' AS name UNION ALL
  SELECT '07' AS dept_dane, '07008' AS dane_code, 'La Montañita' AS name UNION ALL
  SELECT '07' AS dept_dane, '07009' AS dane_code, 'Milán' AS name UNION ALL
  SELECT '07' AS dept_dane, '07010' AS dane_code, 'Morelia' AS name UNION ALL
  SELECT '07' AS dept_dane, '07011' AS dane_code, 'Puerto Rico' AS name UNION ALL
  SELECT '07' AS dept_dane, '07012' AS dane_code, 'San José del Fragua' AS name UNION ALL
  SELECT '07' AS dept_dane, '07013' AS dane_code, 'San Vicente del Caguán' AS name UNION ALL
  SELECT '07' AS dept_dane, '07014' AS dane_code, 'Solano' AS name UNION ALL
  SELECT '07' AS dept_dane, '07015' AS dane_code, 'Solita' AS name UNION ALL
  SELECT '07' AS dept_dane, '07016' AS dane_code, 'Valparaíso' AS name UNION ALL
  SELECT '08' AS dept_dane, '08001' AS dane_code, 'Aguazul' AS name UNION ALL
  SELECT '08' AS dept_dane, '08002' AS dane_code, 'Chámeza' AS name UNION ALL
  SELECT '08' AS dept_dane, '08003' AS dane_code, 'Hato Corozal' AS name UNION ALL
  SELECT '08' AS dept_dane, '08004' AS dane_code, 'La Salina' AS name UNION ALL
  SELECT '08' AS dept_dane, '08005' AS dane_code, 'Maní' AS name UNION ALL
  SELECT '08' AS dept_dane, '08006' AS dane_code, 'Monterrey' AS name UNION ALL
  SELECT '08' AS dept_dane, '08007' AS dane_code, 'Nunchía' AS name UNION ALL
  SELECT '08' AS dept_dane, '08008' AS dane_code, 'Orocué' AS name UNION ALL
  SELECT '08' AS dept_dane, '08009' AS dane_code, 'Paz de Ariporo' AS name UNION ALL
  SELECT '08' AS dept_dane, '08010' AS dane_code, 'Pore' AS name UNION ALL
  SELECT '08' AS dept_dane, '08011' AS dane_code, 'Recetor' AS name UNION ALL
  SELECT '08' AS dept_dane, '08012' AS dane_code, 'Sabanalarga' AS name UNION ALL
  SELECT '08' AS dept_dane, '08013' AS dane_code, 'Sácama' AS name UNION ALL
  SELECT '08' AS dept_dane, '08014' AS dane_code, 'San Luis de Palenque' AS name UNION ALL
  SELECT '08' AS dept_dane, '08015' AS dane_code, 'Támara' AS name UNION ALL
  SELECT '08' AS dept_dane, '08016' AS dane_code, 'Tauramena' AS name UNION ALL
  SELECT '08' AS dept_dane, '08017' AS dane_code, 'Trinidad' AS name UNION ALL
  SELECT '08' AS dept_dane, '08018' AS dane_code, 'Villanueva' AS name UNION ALL
  SELECT '08' AS dept_dane, '08019' AS dane_code, 'Yopal' AS name UNION ALL
  SELECT '09' AS dept_dane, '09001' AS dane_code, 'Almaguer' AS name UNION ALL
  SELECT '09' AS dept_dane, '09002' AS dane_code, 'Argelia' AS name UNION ALL
  SELECT '09' AS dept_dane, '09003' AS dane_code, 'Balboa' AS name UNION ALL
  SELECT '09' AS dept_dane, '09004' AS dane_code, 'Bolívar' AS name UNION ALL
  SELECT '09' AS dept_dane, '09005' AS dane_code, 'Buenos Aires' AS name UNION ALL
  SELECT '09' AS dept_dane, '09006' AS dane_code, 'Cajibío' AS name UNION ALL
  SELECT '09' AS dept_dane, '09007' AS dane_code, 'Caldono' AS name UNION ALL
  SELECT '09' AS dept_dane, '09008' AS dane_code, 'Caloto' AS name UNION ALL
  SELECT '09' AS dept_dane, '09009' AS dane_code, 'Corinto' AS name UNION ALL
  SELECT '09' AS dept_dane, '09010' AS dane_code, 'El Tambo' AS name UNION ALL
  SELECT '09' AS dept_dane, '09011' AS dane_code, 'Florencia' AS name UNION ALL
  SELECT '09' AS dept_dane, '09012' AS dane_code, 'Guachené' AS name UNION ALL
  SELECT '09' AS dept_dane, '09013' AS dane_code, 'Guapí' AS name UNION ALL
  SELECT '09' AS dept_dane, '09014' AS dane_code, 'Inzá' AS name UNION ALL
  SELECT '09' AS dept_dane, '09015' AS dane_code, 'Jambaló' AS name UNION ALL
  SELECT '09' AS dept_dane, '09016' AS dane_code, 'La Sierra' AS name UNION ALL
  SELECT '09' AS dept_dane, '09017' AS dane_code, 'La Vega' AS name UNION ALL
  SELECT '09' AS dept_dane, '09018' AS dane_code, 'López de Micay' AS name UNION ALL
  SELECT '09' AS dept_dane, '09019' AS dane_code, 'Mercaderes' AS name UNION ALL
  SELECT '09' AS dept_dane, '09020' AS dane_code, 'Miranda' AS name UNION ALL
  SELECT '09' AS dept_dane, '09021' AS dane_code, 'Morales' AS name UNION ALL
  SELECT '09' AS dept_dane, '09022' AS dane_code, 'Padilla' AS name UNION ALL
  SELECT '09' AS dept_dane, '09023' AS dane_code, 'Páez' AS name UNION ALL
  SELECT '09' AS dept_dane, '09024' AS dane_code, 'Patía' AS name UNION ALL
  SELECT '09' AS dept_dane, '09025' AS dane_code, 'Piamonte' AS name UNION ALL
  SELECT '09' AS dept_dane, '09026' AS dane_code, 'Piendamó' AS name UNION ALL
  SELECT '09' AS dept_dane, '09027' AS dane_code, 'Popayán' AS name UNION ALL
  SELECT '09' AS dept_dane, '09028' AS dane_code, 'Puerto Tejada' AS name UNION ALL
  SELECT '09' AS dept_dane, '09029' AS dane_code, 'Puracé' AS name UNION ALL
  SELECT '09' AS dept_dane, '09030' AS dane_code, 'Rosas' AS name UNION ALL
  SELECT '09' AS dept_dane, '09031' AS dane_code, 'San Sebastián' AS name UNION ALL
  SELECT '09' AS dept_dane, '09032' AS dane_code, 'Santa Rosa' AS name UNION ALL
  SELECT '09' AS dept_dane, '09033' AS dane_code, 'Santander de Quilichao' AS name UNION ALL
  SELECT '09' AS dept_dane, '09034' AS dane_code, 'Silvia' AS name UNION ALL
  SELECT '09' AS dept_dane, '09035' AS dane_code, 'Sotará' AS name UNION ALL
  SELECT '09' AS dept_dane, '09036' AS dane_code, 'Suárez' AS name UNION ALL
  SELECT '09' AS dept_dane, '09037' AS dane_code, 'Sucre' AS name UNION ALL
  SELECT '09' AS dept_dane, '09038' AS dane_code, 'Timbío' AS name UNION ALL
  SELECT '09' AS dept_dane, '09039' AS dane_code, 'Timbiquí' AS name UNION ALL
  SELECT '09' AS dept_dane, '09040' AS dane_code, 'Toribío' AS name UNION ALL
  SELECT '09' AS dept_dane, '09041' AS dane_code, 'Totoró' AS name UNION ALL
  SELECT '09' AS dept_dane, '09042' AS dane_code, 'Villa Rica' AS name UNION ALL
  SELECT '10' AS dept_dane, '10001' AS dane_code, 'Aguachica' AS name UNION ALL
  SELECT '10' AS dept_dane, '10002' AS dane_code, 'Agustín Codazzi' AS name UNION ALL
  SELECT '10' AS dept_dane, '10003' AS dane_code, 'Astrea' AS name UNION ALL
  SELECT '10' AS dept_dane, '10004' AS dane_code, 'Becerril' AS name UNION ALL
  SELECT '10' AS dept_dane, '10005' AS dane_code, 'Bosconia' AS name UNION ALL
  SELECT '10' AS dept_dane, '10006' AS dane_code, 'Chimichagua' AS name UNION ALL
  SELECT '10' AS dept_dane, '10007' AS dane_code, 'Chiriguaná' AS name UNION ALL
  SELECT '10' AS dept_dane, '10008' AS dane_code, 'Curumaní' AS name UNION ALL
  SELECT '10' AS dept_dane, '10009' AS dane_code, 'El Copey' AS name UNION ALL
  SELECT '10' AS dept_dane, '10010' AS dane_code, 'El Paso' AS name UNION ALL
  SELECT '10' AS dept_dane, '10011' AS dane_code, 'Gamarra' AS name UNION ALL
  SELECT '10' AS dept_dane, '10012' AS dane_code, 'González' AS name UNION ALL
  SELECT '10' AS dept_dane, '10013' AS dane_code, 'La Gloria (Cesar)' AS name UNION ALL
  SELECT '10' AS dept_dane, '10014' AS dane_code, 'La Jagua de Ibirico' AS name UNION ALL
  SELECT '10' AS dept_dane, '10015' AS dane_code, 'La Paz' AS name UNION ALL
  SELECT '10' AS dept_dane, '10016' AS dane_code, 'Manaure Balcón del Cesar' AS name UNION ALL
  SELECT '10' AS dept_dane, '10017' AS dane_code, 'Pailitas' AS name UNION ALL
  SELECT '10' AS dept_dane, '10018' AS dane_code, 'Pelaya' AS name UNION ALL
  SELECT '10' AS dept_dane, '10019' AS dane_code, 'Pueblo Bello' AS name UNION ALL
  SELECT '10' AS dept_dane, '10020' AS dane_code, 'Río de Oro' AS name UNION ALL
  SELECT '10' AS dept_dane, '10021' AS dane_code, 'San Alberto' AS name UNION ALL
  SELECT '10' AS dept_dane, '10022' AS dane_code, 'San Diego' AS name UNION ALL
  SELECT '10' AS dept_dane, '10023' AS dane_code, 'San Martín' AS name UNION ALL
  SELECT '10' AS dept_dane, '10024' AS dane_code, 'Tamalameque' AS name UNION ALL
  SELECT '10' AS dept_dane, '10025' AS dane_code, 'Valledupar' AS name UNION ALL
  SELECT '11' AS dept_dane, '11001' AS dane_code, 'Acandí' AS name UNION ALL
  SELECT '11' AS dept_dane, '11002' AS dane_code, 'Alto Baudó' AS name UNION ALL
  SELECT '11' AS dept_dane, '11003' AS dane_code, 'Bagadó' AS name UNION ALL
  SELECT '11' AS dept_dane, '11004' AS dane_code, 'Bahía Solano' AS name UNION ALL
  SELECT '11' AS dept_dane, '11005' AS dane_code, 'Bajo Baudó' AS name UNION ALL
  SELECT '11' AS dept_dane, '11006' AS dane_code, 'Bojayá' AS name UNION ALL
  SELECT '11' AS dept_dane, '11007' AS dane_code, 'Cantón de San Pablo' AS name UNION ALL
  SELECT '11' AS dept_dane, '11008' AS dane_code, 'Cértegui' AS name UNION ALL
  SELECT '11' AS dept_dane, '11009' AS dane_code, 'Condoto' AS name UNION ALL
  SELECT '11' AS dept_dane, '11010' AS dane_code, 'El Atrato' AS name UNION ALL
  SELECT '11' AS dept_dane, '11011' AS dane_code, 'El Carmen de Atrato' AS name UNION ALL
  SELECT '11' AS dept_dane, '11012' AS dane_code, 'El Carmen del Darién' AS name UNION ALL
  SELECT '11' AS dept_dane, '11013' AS dane_code, 'Istmina' AS name UNION ALL
  SELECT '11' AS dept_dane, '11014' AS dane_code, 'Juradó' AS name UNION ALL
  SELECT '11' AS dept_dane, '11015' AS dane_code, 'Litoral de San Juan' AS name UNION ALL
  SELECT '11' AS dept_dane, '11016' AS dane_code, 'Lloró' AS name UNION ALL
  SELECT '11' AS dept_dane, '11017' AS dane_code, 'Medio Atrato' AS name UNION ALL
  SELECT '11' AS dept_dane, '11018' AS dane_code, 'Medio Baudó' AS name UNION ALL
  SELECT '11' AS dept_dane, '11019' AS dane_code, 'Medio San Juan' AS name UNION ALL
  SELECT '11' AS dept_dane, '11020' AS dane_code, 'Nóvita' AS name UNION ALL
  SELECT '11' AS dept_dane, '11021' AS dane_code, 'Nuquí' AS name UNION ALL
  SELECT '11' AS dept_dane, '11022' AS dane_code, 'Quibdó' AS name UNION ALL
  SELECT '11' AS dept_dane, '11023' AS dane_code, 'Río Iró' AS name UNION ALL
  SELECT '11' AS dept_dane, '11024' AS dane_code, 'Río Quito' AS name UNION ALL
  SELECT '11' AS dept_dane, '11025' AS dane_code, 'Riosucio' AS name UNION ALL
  SELECT '11' AS dept_dane, '11026' AS dane_code, 'San José del Palmar' AS name UNION ALL
  SELECT '11' AS dept_dane, '11027' AS dane_code, 'Sipí' AS name UNION ALL
  SELECT '11' AS dept_dane, '11028' AS dane_code, 'Tadó' AS name UNION ALL
  SELECT '11' AS dept_dane, '11029' AS dane_code, 'Unión Panamericana' AS name UNION ALL
  SELECT '11' AS dept_dane, '11030' AS dane_code, 'Unguía' AS name UNION ALL
  SELECT '12' AS dept_dane, '12001' AS dane_code, 'Agua de Dios' AS name UNION ALL
  SELECT '12' AS dept_dane, '12002' AS dane_code, 'Albán' AS name UNION ALL
  SELECT '12' AS dept_dane, '12003' AS dane_code, 'Anapoima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12004' AS dane_code, 'Anolaima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12005' AS dane_code, 'Apulo' AS name UNION ALL
  SELECT '12' AS dept_dane, '12006' AS dane_code, 'Arbeláez' AS name UNION ALL
  SELECT '12' AS dept_dane, '12007' AS dane_code, 'Beltrán' AS name UNION ALL
  SELECT '12' AS dept_dane, '12008' AS dane_code, 'Bituima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12009' AS dane_code, 'Bogotá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12010' AS dane_code, 'Bojacá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12011' AS dane_code, 'Cabrera' AS name UNION ALL
  SELECT '12' AS dept_dane, '12012' AS dane_code, 'Cachipay' AS name UNION ALL
  SELECT '12' AS dept_dane, '12013' AS dane_code, 'Cajicá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12014' AS dane_code, 'Caparrapí' AS name UNION ALL
  SELECT '12' AS dept_dane, '12015' AS dane_code, 'Cáqueza' AS name UNION ALL
  SELECT '12' AS dept_dane, '12016' AS dane_code, 'Carmen de Carupa' AS name UNION ALL
  SELECT '12' AS dept_dane, '12017' AS dane_code, 'Chaguaní' AS name UNION ALL
  SELECT '12' AS dept_dane, '12018' AS dane_code, 'Chía' AS name UNION ALL
  SELECT '12' AS dept_dane, '12019' AS dane_code, 'Chipaque' AS name UNION ALL
  SELECT '12' AS dept_dane, '12020' AS dane_code, 'Choachí' AS name UNION ALL
  SELECT '12' AS dept_dane, '12021' AS dane_code, 'Chocontá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12022' AS dane_code, 'Cogua' AS name UNION ALL
  SELECT '12' AS dept_dane, '12023' AS dane_code, 'Cota' AS name UNION ALL
  SELECT '12' AS dept_dane, '12024' AS dane_code, 'Cucunubá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12025' AS dane_code, 'El Colegio' AS name UNION ALL
  SELECT '12' AS dept_dane, '12026' AS dane_code, 'El Peñón' AS name UNION ALL
  SELECT '12' AS dept_dane, '12027' AS dane_code, 'El Rosal' AS name UNION ALL
  SELECT '12' AS dept_dane, '12028' AS dane_code, 'Facatativá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12029' AS dane_code, 'Fómeque' AS name UNION ALL
  SELECT '12' AS dept_dane, '12030' AS dane_code, 'Fosca' AS name UNION ALL
  SELECT '12' AS dept_dane, '12031' AS dane_code, 'Funza' AS name UNION ALL
  SELECT '12' AS dept_dane, '12032' AS dane_code, 'Fúquene' AS name UNION ALL
  SELECT '12' AS dept_dane, '12033' AS dane_code, 'Fusagasugá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12034' AS dane_code, 'Gachalá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12035' AS dane_code, 'Gachancipá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12036' AS dane_code, 'Gachetá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12037' AS dane_code, 'Gama' AS name UNION ALL
  SELECT '12' AS dept_dane, '12038' AS dane_code, 'Girardot' AS name UNION ALL
  SELECT '12' AS dept_dane, '12039' AS dane_code, 'Granada' AS name UNION ALL
  SELECT '12' AS dept_dane, '12040' AS dane_code, 'Guachetá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12041' AS dane_code, 'Guaduas' AS name UNION ALL
  SELECT '12' AS dept_dane, '12042' AS dane_code, 'Guasca' AS name UNION ALL
  SELECT '12' AS dept_dane, '12043' AS dane_code, 'Guataquí' AS name UNION ALL
  SELECT '12' AS dept_dane, '12044' AS dane_code, 'Guatavita' AS name UNION ALL
  SELECT '12' AS dept_dane, '12045' AS dane_code, 'Guayabal de Síquima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12046' AS dane_code, 'Guayabetal' AS name UNION ALL
  SELECT '12' AS dept_dane, '12047' AS dane_code, 'Gutiérrez' AS name UNION ALL
  SELECT '12' AS dept_dane, '12048' AS dane_code, 'Jerusalén' AS name UNION ALL
  SELECT '12' AS dept_dane, '12049' AS dane_code, 'Junín' AS name UNION ALL
  SELECT '12' AS dept_dane, '12050' AS dane_code, 'La Calera' AS name UNION ALL
  SELECT '12' AS dept_dane, '12051' AS dane_code, 'La Mesa' AS name UNION ALL
  SELECT '12' AS dept_dane, '12052' AS dane_code, 'La Palma' AS name UNION ALL
  SELECT '12' AS dept_dane, '12053' AS dane_code, 'La Peña' AS name UNION ALL
  SELECT '12' AS dept_dane, '12054' AS dane_code, 'La Vega' AS name UNION ALL
  SELECT '12' AS dept_dane, '12055' AS dane_code, 'Lenguazaque' AS name UNION ALL
  SELECT '12' AS dept_dane, '12056' AS dane_code, 'Machetá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12057' AS dane_code, 'Madrid' AS name UNION ALL
  SELECT '12' AS dept_dane, '12058' AS dane_code, 'Manta' AS name UNION ALL
  SELECT '12' AS dept_dane, '12059' AS dane_code, 'Medina' AS name UNION ALL
  SELECT '12' AS dept_dane, '12060' AS dane_code, 'Mosquera' AS name UNION ALL
  SELECT '12' AS dept_dane, '12061' AS dane_code, 'Nariño' AS name UNION ALL
  SELECT '12' AS dept_dane, '12062' AS dane_code, 'Nemocón' AS name UNION ALL
  SELECT '12' AS dept_dane, '12063' AS dane_code, 'Nilo' AS name UNION ALL
  SELECT '12' AS dept_dane, '12064' AS dane_code, 'Nimaima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12065' AS dane_code, 'Nocaima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12066' AS dane_code, 'Pacho' AS name UNION ALL
  SELECT '12' AS dept_dane, '12067' AS dane_code, 'Paime' AS name UNION ALL
  SELECT '12' AS dept_dane, '12068' AS dane_code, 'Pandi' AS name UNION ALL
  SELECT '12' AS dept_dane, '12069' AS dane_code, 'Paratebueno' AS name UNION ALL
  SELECT '12' AS dept_dane, '12070' AS dane_code, 'Pasca' AS name UNION ALL
  SELECT '12' AS dept_dane, '12071' AS dane_code, 'Puerto Salgar' AS name UNION ALL
  SELECT '12' AS dept_dane, '12072' AS dane_code, 'Pulí' AS name UNION ALL
  SELECT '12' AS dept_dane, '12073' AS dane_code, 'Quebradanegra' AS name UNION ALL
  SELECT '12' AS dept_dane, '12074' AS dane_code, 'Quetame' AS name UNION ALL
  SELECT '12' AS dept_dane, '12075' AS dane_code, 'Quipile' AS name UNION ALL
  SELECT '12' AS dept_dane, '12076' AS dane_code, 'Ricaurte' AS name UNION ALL
  SELECT '12' AS dept_dane, '12077' AS dane_code, 'San Antonio del Tequendama' AS name UNION ALL
  SELECT '12' AS dept_dane, '12078' AS dane_code, 'San Bernardo' AS name UNION ALL
  SELECT '12' AS dept_dane, '12079' AS dane_code, 'San Cayetano' AS name UNION ALL
  SELECT '12' AS dept_dane, '12080' AS dane_code, 'San Francisco' AS name UNION ALL
  SELECT '12' AS dept_dane, '12081' AS dane_code, 'San Juan de Rioseco' AS name UNION ALL
  SELECT '12' AS dept_dane, '12082' AS dane_code, 'Sasaima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12083' AS dane_code, 'Sesquilé' AS name UNION ALL
  SELECT '12' AS dept_dane, '12084' AS dane_code, 'Sibaté' AS name UNION ALL
  SELECT '12' AS dept_dane, '12085' AS dane_code, 'Silvania' AS name UNION ALL
  SELECT '12' AS dept_dane, '12086' AS dane_code, 'Simijaca' AS name UNION ALL
  SELECT '12' AS dept_dane, '12087' AS dane_code, 'Soacha' AS name UNION ALL
  SELECT '12' AS dept_dane, '12088' AS dane_code, 'Sopó' AS name UNION ALL
  SELECT '12' AS dept_dane, '12089' AS dane_code, 'Subachoque' AS name UNION ALL
  SELECT '12' AS dept_dane, '12090' AS dane_code, 'Suesca' AS name UNION ALL
  SELECT '12' AS dept_dane, '12091' AS dane_code, 'Supatá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12092' AS dane_code, 'Susa' AS name UNION ALL
  SELECT '12' AS dept_dane, '12093' AS dane_code, 'Sutatausa' AS name UNION ALL
  SELECT '12' AS dept_dane, '12094' AS dane_code, 'Tabio' AS name UNION ALL
  SELECT '12' AS dept_dane, '12095' AS dane_code, 'Tausa' AS name UNION ALL
  SELECT '12' AS dept_dane, '12096' AS dane_code, 'Tena' AS name UNION ALL
  SELECT '12' AS dept_dane, '12097' AS dane_code, 'Tenjo' AS name UNION ALL
  SELECT '12' AS dept_dane, '12098' AS dane_code, 'Tibacuy' AS name UNION ALL
  SELECT '12' AS dept_dane, '12099' AS dane_code, 'Tibirita' AS name UNION ALL
  SELECT '12' AS dept_dane, '12100' AS dane_code, 'Tocaima' AS name UNION ALL
  SELECT '12' AS dept_dane, '12101' AS dane_code, 'Tocancipá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12102' AS dane_code, 'Topaipí' AS name UNION ALL
  SELECT '12' AS dept_dane, '12103' AS dane_code, 'Ubalá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12104' AS dane_code, 'Ubaque' AS name UNION ALL
  SELECT '12' AS dept_dane, '12105' AS dane_code, 'Ubaté' AS name UNION ALL
  SELECT '12' AS dept_dane, '12106' AS dane_code, 'Une' AS name UNION ALL
  SELECT '12' AS dept_dane, '12107' AS dane_code, 'Útica' AS name UNION ALL
  SELECT '12' AS dept_dane, '12108' AS dane_code, 'Venecia' AS name UNION ALL
  SELECT '12' AS dept_dane, '12109' AS dane_code, 'Vergara' AS name UNION ALL
  SELECT '12' AS dept_dane, '12110' AS dane_code, 'Vianí' AS name UNION ALL
  SELECT '12' AS dept_dane, '12111' AS dane_code, 'Villagómez' AS name UNION ALL
  SELECT '12' AS dept_dane, '12112' AS dane_code, 'Villapinzón' AS name UNION ALL
  SELECT '12' AS dept_dane, '12113' AS dane_code, 'Villeta' AS name UNION ALL
  SELECT '12' AS dept_dane, '12114' AS dane_code, 'Viotá' AS name UNION ALL
  SELECT '12' AS dept_dane, '12115' AS dane_code, 'Yacopí' AS name UNION ALL
  SELECT '12' AS dept_dane, '12116' AS dane_code, 'Zipacón' AS name UNION ALL
  SELECT '12' AS dept_dane, '12117' AS dane_code, 'Zipaquirá' AS name UNION ALL
  SELECT '13' AS dept_dane, '13001' AS dane_code, 'Ayapel' AS name UNION ALL
  SELECT '13' AS dept_dane, '13002' AS dane_code, 'Buenavista' AS name UNION ALL
  SELECT '13' AS dept_dane, '13003' AS dane_code, 'Canalete' AS name UNION ALL
  SELECT '13' AS dept_dane, '13004' AS dane_code, 'Cereté' AS name UNION ALL
  SELECT '13' AS dept_dane, '13005' AS dane_code, 'Chimá' AS name UNION ALL
  SELECT '13' AS dept_dane, '13006' AS dane_code, 'Chinú' AS name UNION ALL
  SELECT '13' AS dept_dane, '13007' AS dane_code, 'Ciénaga de Oro' AS name UNION ALL
  SELECT '13' AS dept_dane, '13008' AS dane_code, 'Cotorra' AS name UNION ALL
  SELECT '13' AS dept_dane, '13009' AS dane_code, 'La Apartada' AS name UNION ALL
  SELECT '13' AS dept_dane, '13010' AS dane_code, 'Lorica' AS name UNION ALL
  SELECT '13' AS dept_dane, '13011' AS dane_code, 'Los Córdobas' AS name UNION ALL
  SELECT '13' AS dept_dane, '13012' AS dane_code, 'Momil' AS name UNION ALL
  SELECT '13' AS dept_dane, '13013' AS dane_code, 'Montelíbano' AS name UNION ALL
  SELECT '13' AS dept_dane, '13014' AS dane_code, 'Montería' AS name UNION ALL
  SELECT '13' AS dept_dane, '13015' AS dane_code, 'Moñitos' AS name UNION ALL
  SELECT '13' AS dept_dane, '13016' AS dane_code, 'Planeta Rica' AS name UNION ALL
  SELECT '13' AS dept_dane, '13017' AS dane_code, 'Pueblo Nuevo' AS name UNION ALL
  SELECT '13' AS dept_dane, '13018' AS dane_code, 'Puerto Escondido' AS name UNION ALL
  SELECT '13' AS dept_dane, '13019' AS dane_code, 'Puerto Libertador' AS name UNION ALL
  SELECT '13' AS dept_dane, '13020' AS dane_code, 'Purísima' AS name UNION ALL
  SELECT '13' AS dept_dane, '13021' AS dane_code, 'Sahagún' AS name UNION ALL
  SELECT '13' AS dept_dane, '13022' AS dane_code, 'San Andrés de Sotavento' AS name UNION ALL
  SELECT '13' AS dept_dane, '13023' AS dane_code, 'San Antero' AS name UNION ALL
  SELECT '13' AS dept_dane, '13024' AS dane_code, 'San Bernardo del Viento' AS name UNION ALL
  SELECT '13' AS dept_dane, '13025' AS dane_code, 'San Carlos' AS name UNION ALL
  SELECT '13' AS dept_dane, '13026' AS dane_code, 'San José de Uré' AS name UNION ALL
  SELECT '13' AS dept_dane, '13027' AS dane_code, 'San Pelayo' AS name UNION ALL
  SELECT '13' AS dept_dane, '13028' AS dane_code, 'Tierralta' AS name UNION ALL
  SELECT '13' AS dept_dane, '13029' AS dane_code, 'Tuchín' AS name UNION ALL
  SELECT '13' AS dept_dane, '13030' AS dane_code, 'Valencia' AS name UNION ALL
  SELECT '14' AS dept_dane, '14001' AS dane_code, 'Inírida' AS name UNION ALL
  SELECT '15' AS dept_dane, '15001' AS dane_code, 'Calamar' AS name UNION ALL
  SELECT '15' AS dept_dane, '15002' AS dane_code, 'El Retorno' AS name UNION ALL
  SELECT '15' AS dept_dane, '15003' AS dane_code, 'Miraflores' AS name UNION ALL
  SELECT '15' AS dept_dane, '15004' AS dane_code, 'San José del Guaviare' AS name UNION ALL
  SELECT '16' AS dept_dane, '16001' AS dane_code, 'Acevedo' AS name UNION ALL
  SELECT '16' AS dept_dane, '16002' AS dane_code, 'Agrado' AS name UNION ALL
  SELECT '16' AS dept_dane, '16003' AS dane_code, 'Aipe' AS name UNION ALL
  SELECT '16' AS dept_dane, '16004' AS dane_code, 'Algeciras' AS name UNION ALL
  SELECT '16' AS dept_dane, '16005' AS dane_code, 'Altamira' AS name UNION ALL
  SELECT '16' AS dept_dane, '16006' AS dane_code, 'Baraya' AS name UNION ALL
  SELECT '16' AS dept_dane, '16007' AS dane_code, 'Campoalegre' AS name UNION ALL
  SELECT '16' AS dept_dane, '16008' AS dane_code, 'Colombia' AS name UNION ALL
  SELECT '16' AS dept_dane, '16009' AS dane_code, 'El Pital' AS name UNION ALL
  SELECT '16' AS dept_dane, '16010' AS dane_code, 'Elías' AS name UNION ALL
  SELECT '16' AS dept_dane, '16011' AS dane_code, 'Garzón' AS name UNION ALL
  SELECT '16' AS dept_dane, '16012' AS dane_code, 'Gigante' AS name UNION ALL
  SELECT '16' AS dept_dane, '16013' AS dane_code, 'Guadalupe' AS name UNION ALL
  SELECT '16' AS dept_dane, '16014' AS dane_code, 'Hobo' AS name UNION ALL
  SELECT '16' AS dept_dane, '16015' AS dane_code, 'Íquira' AS name UNION ALL
  SELECT '16' AS dept_dane, '16016' AS dane_code, 'Isnos' AS name UNION ALL
  SELECT '16' AS dept_dane, '16017' AS dane_code, 'La Argentina' AS name UNION ALL
  SELECT '16' AS dept_dane, '16018' AS dane_code, 'La Plata' AS name UNION ALL
  SELECT '16' AS dept_dane, '16019' AS dane_code, 'Nátaga' AS name UNION ALL
  SELECT '16' AS dept_dane, '16020' AS dane_code, 'Neiva' AS name UNION ALL
  SELECT '16' AS dept_dane, '16021' AS dane_code, 'Oporapa' AS name UNION ALL
  SELECT '16' AS dept_dane, '16022' AS dane_code, 'Paicol' AS name UNION ALL
  SELECT '16' AS dept_dane, '16023' AS dane_code, 'Palermo' AS name UNION ALL
  SELECT '16' AS dept_dane, '16024' AS dane_code, 'Palestina' AS name UNION ALL
  SELECT '16' AS dept_dane, '16025' AS dane_code, 'Pitalito' AS name UNION ALL
  SELECT '16' AS dept_dane, '16026' AS dane_code, 'Rivera' AS name UNION ALL
  SELECT '16' AS dept_dane, '16027' AS dane_code, 'Saladoblanco' AS name UNION ALL
  SELECT '16' AS dept_dane, '16028' AS dane_code, 'San Agustín' AS name UNION ALL
  SELECT '16' AS dept_dane, '16029' AS dane_code, 'Santa María' AS name UNION ALL
  SELECT '16' AS dept_dane, '16030' AS dane_code, 'Suaza' AS name UNION ALL
  SELECT '16' AS dept_dane, '16031' AS dane_code, 'Tarqui' AS name UNION ALL
  SELECT '16' AS dept_dane, '16032' AS dane_code, 'Tello' AS name UNION ALL
  SELECT '16' AS dept_dane, '16033' AS dane_code, 'Teruel' AS name UNION ALL
  SELECT '16' AS dept_dane, '16034' AS dane_code, 'Tesalia' AS name UNION ALL
  SELECT '16' AS dept_dane, '16035' AS dane_code, 'Timaná' AS name UNION ALL
  SELECT '16' AS dept_dane, '16036' AS dane_code, 'Villavieja' AS name UNION ALL
  SELECT '16' AS dept_dane, '16037' AS dane_code, 'Yaguará' AS name UNION ALL
  SELECT '17' AS dept_dane, '17001' AS dane_code, 'Albania' AS name UNION ALL
  SELECT '17' AS dept_dane, '17002' AS dane_code, 'Barrancas' AS name UNION ALL
  SELECT '17' AS dept_dane, '17003' AS dane_code, 'Dibulla' AS name UNION ALL
  SELECT '17' AS dept_dane, '17004' AS dane_code, 'Distracción' AS name UNION ALL
  SELECT '17' AS dept_dane, '17005' AS dane_code, 'El Molino' AS name UNION ALL
  SELECT '17' AS dept_dane, '17006' AS dane_code, 'Fonseca' AS name UNION ALL
  SELECT '17' AS dept_dane, '17007' AS dane_code, 'Hatonuevo' AS name UNION ALL
  SELECT '17' AS dept_dane, '17008' AS dane_code, 'La Jagua del Pilar' AS name UNION ALL
  SELECT '17' AS dept_dane, '17009' AS dane_code, 'Maicao' AS name UNION ALL
  SELECT '17' AS dept_dane, '17010' AS dane_code, 'Manaure' AS name UNION ALL
  SELECT '17' AS dept_dane, '17011' AS dane_code, 'Riohacha' AS name UNION ALL
  SELECT '17' AS dept_dane, '17012' AS dane_code, 'San Juan del Cesar' AS name UNION ALL
  SELECT '17' AS dept_dane, '17013' AS dane_code, 'Uribia' AS name UNION ALL
  SELECT '17' AS dept_dane, '17014' AS dane_code, 'Urumita' AS name UNION ALL
  SELECT '17' AS dept_dane, '17015' AS dane_code, 'Villanueva' AS name UNION ALL
  SELECT '18' AS dept_dane, '18001' AS dane_code, 'Algarrobo' AS name UNION ALL
  SELECT '18' AS dept_dane, '18002' AS dane_code, 'Aracataca' AS name UNION ALL
  SELECT '18' AS dept_dane, '18003' AS dane_code, 'Ariguaní' AS name UNION ALL
  SELECT '18' AS dept_dane, '18004' AS dane_code, 'Cerro de San Antonio' AS name UNION ALL
  SELECT '18' AS dept_dane, '18005' AS dane_code, 'Chibolo' AS name UNION ALL
  SELECT '18' AS dept_dane, '18006' AS dane_code, 'Chibolo' AS name UNION ALL
  SELECT '18' AS dept_dane, '18007' AS dane_code, 'Ciénaga' AS name UNION ALL
  SELECT '18' AS dept_dane, '18008' AS dane_code, 'Concordia' AS name UNION ALL
  SELECT '18' AS dept_dane, '18009' AS dane_code, 'El Banco' AS name UNION ALL
  SELECT '18' AS dept_dane, '18010' AS dane_code, 'El Piñón' AS name UNION ALL
  SELECT '18' AS dept_dane, '18011' AS dane_code, 'El Retén' AS name UNION ALL
  SELECT '18' AS dept_dane, '18012' AS dane_code, 'Fundación' AS name UNION ALL
  SELECT '18' AS dept_dane, '18013' AS dane_code, 'Guamal' AS name UNION ALL
  SELECT '18' AS dept_dane, '18014' AS dane_code, 'Nueva Granada' AS name UNION ALL
  SELECT '18' AS dept_dane, '18015' AS dane_code, 'Pedraza' AS name UNION ALL
  SELECT '18' AS dept_dane, '18016' AS dane_code, 'Pijiño del Carmen' AS name UNION ALL
  SELECT '18' AS dept_dane, '18017' AS dane_code, 'Pivijay' AS name UNION ALL
  SELECT '18' AS dept_dane, '18018' AS dane_code, 'Plato' AS name UNION ALL
  SELECT '18' AS dept_dane, '18019' AS dane_code, 'Pueblo Viejo' AS name UNION ALL
  SELECT '18' AS dept_dane, '18020' AS dane_code, 'Remolino' AS name UNION ALL
  SELECT '18' AS dept_dane, '18021' AS dane_code, 'Sabanas de San Ángel' AS name UNION ALL
  SELECT '18' AS dept_dane, '18022' AS dane_code, 'Salamina' AS name UNION ALL
  SELECT '18' AS dept_dane, '18023' AS dane_code, 'San Sebastián de Buenavista' AS name UNION ALL
  SELECT '18' AS dept_dane, '18024' AS dane_code, 'San Zenón' AS name UNION ALL
  SELECT '18' AS dept_dane, '18025' AS dane_code, 'Santa Ana' AS name UNION ALL
  SELECT '18' AS dept_dane, '18026' AS dane_code, 'Santa Bárbara de Pinto' AS name UNION ALL
  SELECT '18' AS dept_dane, '18027' AS dane_code, 'Santa Marta' AS name UNION ALL
  SELECT '18' AS dept_dane, '18028' AS dane_code, 'Sitionuevo' AS name UNION ALL
  SELECT '18' AS dept_dane, '18029' AS dane_code, 'Tenerife' AS name UNION ALL
  SELECT '18' AS dept_dane, '18030' AS dane_code, 'Zapayán' AS name UNION ALL
  SELECT '18' AS dept_dane, '18031' AS dane_code, 'Zona Bananera' AS name UNION ALL
  SELECT '19' AS dept_dane, '19001' AS dane_code, 'Acacías' AS name UNION ALL
  SELECT '19' AS dept_dane, '19002' AS dane_code, 'Barranca de Upía' AS name UNION ALL
  SELECT '19' AS dept_dane, '19003' AS dane_code, 'Cabuyaro' AS name UNION ALL
  SELECT '19' AS dept_dane, '19004' AS dane_code, 'Castilla la Nueva' AS name UNION ALL
  SELECT '19' AS dept_dane, '19005' AS dane_code, 'Cubarral' AS name UNION ALL
  SELECT '19' AS dept_dane, '19006' AS dane_code, 'Cumaral' AS name UNION ALL
  SELECT '19' AS dept_dane, '19007' AS dane_code, 'El Calvario' AS name UNION ALL
  SELECT '19' AS dept_dane, '19008' AS dane_code, 'El Castillo' AS name UNION ALL
  SELECT '19' AS dept_dane, '19009' AS dane_code, 'El Dorado' AS name UNION ALL
  SELECT '19' AS dept_dane, '19010' AS dane_code, 'Fuente de Oro' AS name UNION ALL
  SELECT '19' AS dept_dane, '19011' AS dane_code, 'Granada' AS name UNION ALL
  SELECT '19' AS dept_dane, '19012' AS dane_code, 'Guamal' AS name UNION ALL
  SELECT '19' AS dept_dane, '19013' AS dane_code, 'La Macarena' AS name UNION ALL
  SELECT '19' AS dept_dane, '19014' AS dane_code, 'La Uribe' AS name UNION ALL
  SELECT '19' AS dept_dane, '19015' AS dane_code, 'Lejanías' AS name UNION ALL
  SELECT '19' AS dept_dane, '19016' AS dane_code, 'Mapiripán' AS name UNION ALL
  SELECT '19' AS dept_dane, '19017' AS dane_code, 'Mesetas' AS name UNION ALL
  SELECT '19' AS dept_dane, '19018' AS dane_code, 'Puerto Concordia' AS name UNION ALL
  SELECT '19' AS dept_dane, '19019' AS dane_code, 'Puerto Gaitán' AS name UNION ALL
  SELECT '19' AS dept_dane, '19020' AS dane_code, 'Puerto Lleras' AS name UNION ALL
  SELECT '19' AS dept_dane, '19021' AS dane_code, 'Puerto López' AS name UNION ALL
  SELECT '19' AS dept_dane, '19022' AS dane_code, 'Puerto Rico' AS name UNION ALL
  SELECT '19' AS dept_dane, '19023' AS dane_code, 'Restrepo' AS name UNION ALL
  SELECT '19' AS dept_dane, '19024' AS dane_code, 'San Carlos de Guaroa' AS name UNION ALL
  SELECT '19' AS dept_dane, '19025' AS dane_code, 'San Juan de Arama' AS name UNION ALL
  SELECT '19' AS dept_dane, '19026' AS dane_code, 'San Juanito' AS name UNION ALL
  SELECT '19' AS dept_dane, '19027' AS dane_code, 'San Martín' AS name UNION ALL
  SELECT '19' AS dept_dane, '19028' AS dane_code, 'Villavicencio' AS name UNION ALL
  SELECT '19' AS dept_dane, '19029' AS dane_code, 'Vista Hermosa' AS name UNION ALL
  SELECT '20' AS dept_dane, '20001' AS dane_code, 'Aldana' AS name UNION ALL
  SELECT '20' AS dept_dane, '20002' AS dane_code, 'Ancuyá' AS name UNION ALL
  SELECT '20' AS dept_dane, '20003' AS dane_code, 'Arboleda' AS name UNION ALL
  SELECT '20' AS dept_dane, '20004' AS dane_code, 'Barbacoas' AS name UNION ALL
  SELECT '20' AS dept_dane, '20005' AS dane_code, 'Belén' AS name UNION ALL
  SELECT '20' AS dept_dane, '20006' AS dane_code, 'Buesaco' AS name UNION ALL
  SELECT '20' AS dept_dane, '20007' AS dane_code, 'Chachagüí' AS name UNION ALL
  SELECT '20' AS dept_dane, '20008' AS dane_code, 'Colón' AS name UNION ALL
  SELECT '20' AS dept_dane, '20009' AS dane_code, 'Consacá' AS name UNION ALL
  SELECT '20' AS dept_dane, '20010' AS dane_code, 'Contadero' AS name UNION ALL
  SELECT '20' AS dept_dane, '20011' AS dane_code, 'Córdoba' AS name UNION ALL
  SELECT '20' AS dept_dane, '20012' AS dane_code, 'Cuaspud' AS name UNION ALL
  SELECT '20' AS dept_dane, '20013' AS dane_code, 'Cumbal' AS name UNION ALL
  SELECT '20' AS dept_dane, '20014' AS dane_code, 'Cumbitara' AS name UNION ALL
  SELECT '20' AS dept_dane, '20015' AS dane_code, 'El Charco' AS name UNION ALL
  SELECT '20' AS dept_dane, '20016' AS dane_code, 'El Peñol' AS name UNION ALL
  SELECT '20' AS dept_dane, '20017' AS dane_code, 'El Rosario' AS name UNION ALL
  SELECT '20' AS dept_dane, '20018' AS dane_code, 'El Tablón' AS name UNION ALL
  SELECT '20' AS dept_dane, '20019' AS dane_code, 'El Tambo' AS name UNION ALL
  SELECT '20' AS dept_dane, '20020' AS dane_code, 'Francisco Pizarro' AS name UNION ALL
  SELECT '20' AS dept_dane, '20021' AS dane_code, 'Funes' AS name UNION ALL
  SELECT '20' AS dept_dane, '20022' AS dane_code, 'Guachucal' AS name UNION ALL
  SELECT '20' AS dept_dane, '20023' AS dane_code, 'Guaitarilla' AS name UNION ALL
  SELECT '20' AS dept_dane, '20024' AS dane_code, 'Gualmatán' AS name UNION ALL
  SELECT '20' AS dept_dane, '20025' AS dane_code, 'Iles' AS name UNION ALL
  SELECT '20' AS dept_dane, '20026' AS dane_code, 'Imués' AS name UNION ALL
  SELECT '20' AS dept_dane, '20027' AS dane_code, 'Ipiales' AS name UNION ALL
  SELECT '20' AS dept_dane, '20028' AS dane_code, 'La Cruz' AS name UNION ALL
  SELECT '20' AS dept_dane, '20029' AS dane_code, 'La Florida' AS name UNION ALL
  SELECT '20' AS dept_dane, '20030' AS dane_code, 'La Llanada' AS name UNION ALL
  SELECT '20' AS dept_dane, '20031' AS dane_code, 'La Tola' AS name UNION ALL
  SELECT '20' AS dept_dane, '20032' AS dane_code, 'La Unión' AS name UNION ALL
  SELECT '20' AS dept_dane, '20033' AS dane_code, 'Leiva' AS name UNION ALL
  SELECT '20' AS dept_dane, '20034' AS dane_code, 'Linares' AS name UNION ALL
  SELECT '20' AS dept_dane, '20035' AS dane_code, 'Los Andes' AS name UNION ALL
  SELECT '20' AS dept_dane, '20036' AS dane_code, 'Magüí Payán' AS name UNION ALL
  SELECT '20' AS dept_dane, '20037' AS dane_code, 'Mallama' AS name UNION ALL
  SELECT '20' AS dept_dane, '20038' AS dane_code, 'Mosquera' AS name UNION ALL
  SELECT '20' AS dept_dane, '20039' AS dane_code, 'Nariño' AS name UNION ALL
  SELECT '20' AS dept_dane, '20040' AS dane_code, 'Olaya Herrera' AS name UNION ALL
  SELECT '20' AS dept_dane, '20041' AS dane_code, 'Ospina' AS name UNION ALL
  SELECT '20' AS dept_dane, '20042' AS dane_code, 'Pasto' AS name UNION ALL
  SELECT '20' AS dept_dane, '20043' AS dane_code, 'Policarpa' AS name UNION ALL
  SELECT '20' AS dept_dane, '20044' AS dane_code, 'Potosí' AS name UNION ALL
  SELECT '20' AS dept_dane, '20045' AS dane_code, 'Providencia' AS name UNION ALL
  SELECT '20' AS dept_dane, '20046' AS dane_code, 'Puerres' AS name UNION ALL
  SELECT '20' AS dept_dane, '20047' AS dane_code, 'Pupiales' AS name UNION ALL
  SELECT '20' AS dept_dane, '20048' AS dane_code, 'Ricaurte' AS name UNION ALL
  SELECT '20' AS dept_dane, '20049' AS dane_code, 'Roberto Payán' AS name UNION ALL
  SELECT '20' AS dept_dane, '20050' AS dane_code, 'Samaniego' AS name UNION ALL
  SELECT '20' AS dept_dane, '20051' AS dane_code, 'San Bernardo' AS name UNION ALL
  SELECT '20' AS dept_dane, '20052' AS dane_code, 'San José de Albán' AS name UNION ALL
  SELECT '20' AS dept_dane, '20053' AS dane_code, 'San Lorenzo' AS name UNION ALL
  SELECT '20' AS dept_dane, '20054' AS dane_code, 'San Pablo' AS name UNION ALL
  SELECT '20' AS dept_dane, '20055' AS dane_code, 'San Pedro de Cartago' AS name UNION ALL
  SELECT '20' AS dept_dane, '20056' AS dane_code, 'Sandoná' AS name UNION ALL
  SELECT '20' AS dept_dane, '20057' AS dane_code, 'Santa Bárbara' AS name UNION ALL
  SELECT '20' AS dept_dane, '20058' AS dane_code, 'Santacruz' AS name UNION ALL
  SELECT '20' AS dept_dane, '20059' AS dane_code, 'Sapuyes' AS name UNION ALL
  SELECT '20' AS dept_dane, '20060' AS dane_code, 'Taminango' AS name UNION ALL
  SELECT '20' AS dept_dane, '20061' AS dane_code, 'Tangua' AS name UNION ALL
  SELECT '20' AS dept_dane, '20062' AS dane_code, 'Tumaco' AS name UNION ALL
  SELECT '20' AS dept_dane, '20063' AS dane_code, 'Túquerres' AS name UNION ALL
  SELECT '20' AS dept_dane, '20064' AS dane_code, 'Yacuanquer' AS name UNION ALL
  SELECT '21' AS dept_dane, '21001' AS dane_code, 'Ábrego' AS name UNION ALL
  SELECT '21' AS dept_dane, '21002' AS dane_code, 'Arboledas' AS name UNION ALL
  SELECT '21' AS dept_dane, '21003' AS dane_code, 'Bochalema' AS name UNION ALL
  SELECT '21' AS dept_dane, '21004' AS dane_code, 'Bucarasica' AS name UNION ALL
  SELECT '21' AS dept_dane, '21005' AS dane_code, 'Cáchira' AS name UNION ALL
  SELECT '21' AS dept_dane, '21006' AS dane_code, 'Cácota' AS name UNION ALL
  SELECT '21' AS dept_dane, '21007' AS dane_code, 'Chinácota' AS name UNION ALL
  SELECT '21' AS dept_dane, '21008' AS dane_code, 'Chitagá' AS name UNION ALL
  SELECT '21' AS dept_dane, '21009' AS dane_code, 'Convención' AS name UNION ALL
  SELECT '21' AS dept_dane, '21010' AS dane_code, 'Cúcuta' AS name UNION ALL
  SELECT '21' AS dept_dane, '21011' AS dane_code, 'Cucutilla' AS name UNION ALL
  SELECT '21' AS dept_dane, '21012' AS dane_code, 'Duranía' AS name UNION ALL
  SELECT '21' AS dept_dane, '21013' AS dane_code, 'El Carmen' AS name UNION ALL
  SELECT '21' AS dept_dane, '21014' AS dane_code, 'El Tarra' AS name UNION ALL
  SELECT '21' AS dept_dane, '21015' AS dane_code, 'El Zulia' AS name UNION ALL
  SELECT '21' AS dept_dane, '21016' AS dane_code, 'Gramalote' AS name UNION ALL
  SELECT '21' AS dept_dane, '21017' AS dane_code, 'Hacarí' AS name UNION ALL
  SELECT '21' AS dept_dane, '21018' AS dane_code, 'Herrán' AS name UNION ALL
  SELECT '21' AS dept_dane, '21019' AS dane_code, 'La Esperanza' AS name UNION ALL
  SELECT '21' AS dept_dane, '21020' AS dane_code, 'La Playa de Belén' AS name UNION ALL
  SELECT '21' AS dept_dane, '21021' AS dane_code, 'Labateca' AS name UNION ALL
  SELECT '21' AS dept_dane, '21022' AS dane_code, 'Los Patios' AS name UNION ALL
  SELECT '21' AS dept_dane, '21023' AS dane_code, 'Lourdes' AS name UNION ALL
  SELECT '21' AS dept_dane, '21024' AS dane_code, 'Mutiscua' AS name UNION ALL
  SELECT '21' AS dept_dane, '21025' AS dane_code, 'Ocaña' AS name UNION ALL
  SELECT '21' AS dept_dane, '21026' AS dane_code, 'Pamplona' AS name UNION ALL
  SELECT '21' AS dept_dane, '21027' AS dane_code, 'Pamplonita' AS name UNION ALL
  SELECT '21' AS dept_dane, '21028' AS dane_code, 'Puerto Santander' AS name UNION ALL
  SELECT '21' AS dept_dane, '21029' AS dane_code, 'Ragonvalia' AS name UNION ALL
  SELECT '21' AS dept_dane, '21030' AS dane_code, 'Salazar de Las Palmas' AS name UNION ALL
  SELECT '21' AS dept_dane, '21031' AS dane_code, 'San Calixto' AS name UNION ALL
  SELECT '21' AS dept_dane, '21032' AS dane_code, 'San Cayetano' AS name UNION ALL
  SELECT '21' AS dept_dane, '21033' AS dane_code, 'Santiago' AS name UNION ALL
  SELECT '21' AS dept_dane, '21034' AS dane_code, 'Santo Domingo de Silos' AS name UNION ALL
  SELECT '21' AS dept_dane, '21035' AS dane_code, 'Sardinata' AS name UNION ALL
  SELECT '21' AS dept_dane, '21036' AS dane_code, 'Teorama' AS name UNION ALL
  SELECT '21' AS dept_dane, '21037' AS dane_code, 'Tibú' AS name UNION ALL
  SELECT '21' AS dept_dane, '21038' AS dane_code, 'Toledo' AS name UNION ALL
  SELECT '21' AS dept_dane, '21039' AS dane_code, 'Villa Caro' AS name UNION ALL
  SELECT '21' AS dept_dane, '21040' AS dane_code, 'Villa del Rosario' AS name UNION ALL
  SELECT '22' AS dept_dane, '22001' AS dane_code, 'Colón' AS name UNION ALL
  SELECT '22' AS dept_dane, '22002' AS dane_code, 'Mocoa' AS name UNION ALL
  SELECT '22' AS dept_dane, '22003' AS dane_code, 'Orito' AS name UNION ALL
  SELECT '22' AS dept_dane, '22004' AS dane_code, 'Puerto Asís' AS name UNION ALL
  SELECT '22' AS dept_dane, '22005' AS dane_code, 'Puerto Caicedo' AS name UNION ALL
  SELECT '22' AS dept_dane, '22006' AS dane_code, 'Puerto Guzmán' AS name UNION ALL
  SELECT '22' AS dept_dane, '22007' AS dane_code, 'Puerto Leguízamo' AS name UNION ALL
  SELECT '22' AS dept_dane, '22008' AS dane_code, 'San Francisco' AS name UNION ALL
  SELECT '22' AS dept_dane, '22009' AS dane_code, 'San Miguel' AS name UNION ALL
  SELECT '22' AS dept_dane, '22010' AS dane_code, 'Santiago' AS name UNION ALL
  SELECT '22' AS dept_dane, '22011' AS dane_code, 'Sibundoy' AS name UNION ALL
  SELECT '22' AS dept_dane, '22012' AS dane_code, 'Valle del Guamuez' AS name UNION ALL
  SELECT '22' AS dept_dane, '22013' AS dane_code, 'Villagarzón' AS name UNION ALL
  SELECT '23' AS dept_dane, '23001' AS dane_code, 'Armenia' AS name UNION ALL
  SELECT '23' AS dept_dane, '23002' AS dane_code, 'Buenavista' AS name UNION ALL
  SELECT '23' AS dept_dane, '23003' AS dane_code, 'Calarcá' AS name UNION ALL
  SELECT '23' AS dept_dane, '23004' AS dane_code, 'Circasia' AS name UNION ALL
  SELECT '23' AS dept_dane, '23005' AS dane_code, 'Córdoba' AS name UNION ALL
  SELECT '23' AS dept_dane, '23006' AS dane_code, 'Filandia' AS name UNION ALL
  SELECT '23' AS dept_dane, '23007' AS dane_code, 'Génova' AS name UNION ALL
  SELECT '23' AS dept_dane, '23008' AS dane_code, 'La Tebaida' AS name UNION ALL
  SELECT '23' AS dept_dane, '23009' AS dane_code, 'Montenegro' AS name UNION ALL
  SELECT '23' AS dept_dane, '23010' AS dane_code, 'Pijao' AS name UNION ALL
  SELECT '23' AS dept_dane, '23011' AS dane_code, 'Quimbaya' AS name UNION ALL
  SELECT '23' AS dept_dane, '23012' AS dane_code, 'Salento' AS name UNION ALL
  SELECT '24' AS dept_dane, '24001' AS dane_code, 'Apía' AS name UNION ALL
  SELECT '24' AS dept_dane, '24002' AS dane_code, 'Balboa' AS name UNION ALL
  SELECT '24' AS dept_dane, '24003' AS dane_code, 'Belén de Umbría' AS name UNION ALL
  SELECT '24' AS dept_dane, '24004' AS dane_code, 'Dosquebradas' AS name UNION ALL
  SELECT '24' AS dept_dane, '24005' AS dane_code, 'Guática' AS name UNION ALL
  SELECT '24' AS dept_dane, '24006' AS dane_code, 'La Celia' AS name UNION ALL
  SELECT '24' AS dept_dane, '24007' AS dane_code, 'La Virginia' AS name UNION ALL
  SELECT '24' AS dept_dane, '24008' AS dane_code, 'Marsella' AS name UNION ALL
  SELECT '24' AS dept_dane, '24009' AS dane_code, 'Mistrató' AS name UNION ALL
  SELECT '24' AS dept_dane, '24010' AS dane_code, 'Pereira' AS name UNION ALL
  SELECT '24' AS dept_dane, '24011' AS dane_code, 'Pueblo Rico' AS name UNION ALL
  SELECT '24' AS dept_dane, '24012' AS dane_code, 'Quinchía' AS name UNION ALL
  SELECT '24' AS dept_dane, '24013' AS dane_code, 'Santa Rosa de Cabal' AS name UNION ALL
  SELECT '24' AS dept_dane, '24014' AS dane_code, 'Santuario' AS name UNION ALL
  SELECT '25' AS dept_dane, '25001' AS dane_code, 'Providencia y Santa Catalina Islas' AS name UNION ALL
  SELECT '25' AS dept_dane, '25002' AS dane_code, 'San Andrés' AS name UNION ALL
  SELECT '26' AS dept_dane, '26001' AS dane_code, 'Aguada' AS name UNION ALL
  SELECT '26' AS dept_dane, '26002' AS dane_code, 'Albania' AS name UNION ALL
  SELECT '26' AS dept_dane, '26003' AS dane_code, 'Aratoca' AS name UNION ALL
  SELECT '26' AS dept_dane, '26004' AS dane_code, 'Barbosa' AS name UNION ALL
  SELECT '26' AS dept_dane, '26005' AS dane_code, 'Barichara' AS name UNION ALL
  SELECT '26' AS dept_dane, '26006' AS dane_code, 'Barrancabermeja' AS name UNION ALL
  SELECT '26' AS dept_dane, '26007' AS dane_code, 'Betulia' AS name UNION ALL
  SELECT '26' AS dept_dane, '26008' AS dane_code, 'Bolívar' AS name UNION ALL
  SELECT '26' AS dept_dane, '26009' AS dane_code, 'Bucaramanga' AS name UNION ALL
  SELECT '26' AS dept_dane, '26010' AS dane_code, 'Cabrera' AS name UNION ALL
  SELECT '26' AS dept_dane, '26011' AS dane_code, 'California' AS name UNION ALL
  SELECT '26' AS dept_dane, '26012' AS dane_code, 'Capitanejo' AS name UNION ALL
  SELECT '26' AS dept_dane, '26013' AS dane_code, 'Carcasí' AS name UNION ALL
  SELECT '26' AS dept_dane, '26014' AS dane_code, 'Cepitá' AS name UNION ALL
  SELECT '26' AS dept_dane, '26015' AS dane_code, 'Cerrito' AS name UNION ALL
  SELECT '26' AS dept_dane, '26016' AS dane_code, 'Charalá' AS name UNION ALL
  SELECT '26' AS dept_dane, '26017' AS dane_code, 'Charta' AS name UNION ALL
  SELECT '26' AS dept_dane, '26018' AS dane_code, 'Chima' AS name UNION ALL
  SELECT '26' AS dept_dane, '26019' AS dane_code, 'Chipatá' AS name UNION ALL
  SELECT '26' AS dept_dane, '26020' AS dane_code, 'Cimitarra' AS name UNION ALL
  SELECT '26' AS dept_dane, '26021' AS dane_code, 'Concepción' AS name UNION ALL
  SELECT '26' AS dept_dane, '26022' AS dane_code, 'Confines' AS name UNION ALL
  SELECT '26' AS dept_dane, '26023' AS dane_code, 'Contratación' AS name UNION ALL
  SELECT '26' AS dept_dane, '26024' AS dane_code, 'Coromoro' AS name UNION ALL
  SELECT '26' AS dept_dane, '26025' AS dane_code, 'Curití' AS name UNION ALL
  SELECT '26' AS dept_dane, '26026' AS dane_code, 'El Carmen de Chucurí' AS name UNION ALL
  SELECT '26' AS dept_dane, '26027' AS dane_code, 'El Guacamayo' AS name UNION ALL
  SELECT '26' AS dept_dane, '26028' AS dane_code, 'El Peñón' AS name UNION ALL
  SELECT '26' AS dept_dane, '26029' AS dane_code, 'El Playón' AS name UNION ALL
  SELECT '26' AS dept_dane, '26030' AS dane_code, 'El Socorro' AS name UNION ALL
  SELECT '26' AS dept_dane, '26031' AS dane_code, 'Encino' AS name UNION ALL
  SELECT '26' AS dept_dane, '26032' AS dane_code, 'Enciso' AS name UNION ALL
  SELECT '26' AS dept_dane, '26033' AS dane_code, 'Florián' AS name UNION ALL
  SELECT '26' AS dept_dane, '26034' AS dane_code, 'Floridablanca' AS name UNION ALL
  SELECT '26' AS dept_dane, '26035' AS dane_code, 'Galán' AS name UNION ALL
  SELECT '26' AS dept_dane, '26036' AS dane_code, 'Gámbita' AS name UNION ALL
  SELECT '26' AS dept_dane, '26037' AS dane_code, 'Girón' AS name UNION ALL
  SELECT '26' AS dept_dane, '26038' AS dane_code, 'Guaca' AS name UNION ALL
  SELECT '26' AS dept_dane, '26039' AS dane_code, 'Guadalupe' AS name UNION ALL
  SELECT '26' AS dept_dane, '26040' AS dane_code, 'Guapotá' AS name UNION ALL
  SELECT '26' AS dept_dane, '26041' AS dane_code, 'Guavatá' AS name UNION ALL
  SELECT '26' AS dept_dane, '26042' AS dane_code, 'Güepsa' AS name UNION ALL
  SELECT '26' AS dept_dane, '26043' AS dane_code, 'Hato' AS name UNION ALL
  SELECT '26' AS dept_dane, '26044' AS dane_code, 'Jesús María' AS name UNION ALL
  SELECT '26' AS dept_dane, '26045' AS dane_code, 'Jordán' AS name UNION ALL
  SELECT '26' AS dept_dane, '26046' AS dane_code, 'La Belleza' AS name UNION ALL
  SELECT '26' AS dept_dane, '26047' AS dane_code, 'La Paz' AS name UNION ALL
  SELECT '26' AS dept_dane, '26048' AS dane_code, 'Landázuri' AS name UNION ALL
  SELECT '26' AS dept_dane, '26049' AS dane_code, 'Lebrija' AS name UNION ALL
  SELECT '26' AS dept_dane, '26050' AS dane_code, 'Los Santos' AS name UNION ALL
  SELECT '26' AS dept_dane, '26051' AS dane_code, 'Macaravita' AS name UNION ALL
  SELECT '26' AS dept_dane, '26052' AS dane_code, 'Málaga' AS name UNION ALL
  SELECT '26' AS dept_dane, '26053' AS dane_code, 'Matanza' AS name UNION ALL
  SELECT '26' AS dept_dane, '26054' AS dane_code, 'Mogotes' AS name UNION ALL
  SELECT '26' AS dept_dane, '26055' AS dane_code, 'Molagavita' AS name UNION ALL
  SELECT '26' AS dept_dane, '26056' AS dane_code, 'Ocamonte' AS name UNION ALL
  SELECT '26' AS dept_dane, '26057' AS dane_code, 'Oiba' AS name UNION ALL
  SELECT '26' AS dept_dane, '26058' AS dane_code, 'Onzaga' AS name UNION ALL
  SELECT '26' AS dept_dane, '26059' AS dane_code, 'Palmar' AS name UNION ALL
  SELECT '26' AS dept_dane, '26060' AS dane_code, 'Palmas del Socorro' AS name UNION ALL
  SELECT '26' AS dept_dane, '26061' AS dane_code, 'Páramo' AS name UNION ALL
  SELECT '26' AS dept_dane, '26062' AS dane_code, 'Piedecuesta' AS name UNION ALL
  SELECT '26' AS dept_dane, '26063' AS dane_code, 'Pinchote' AS name UNION ALL
  SELECT '26' AS dept_dane, '26064' AS dane_code, 'Puente Nacional' AS name UNION ALL
  SELECT '26' AS dept_dane, '26065' AS dane_code, 'Puerto Parra' AS name UNION ALL
  SELECT '26' AS dept_dane, '26066' AS dane_code, 'Puerto Wilches' AS name UNION ALL
  SELECT '26' AS dept_dane, '26067' AS dane_code, 'Rionegro' AS name UNION ALL
  SELECT '26' AS dept_dane, '26068' AS dane_code, 'Sabana de Torres' AS name UNION ALL
  SELECT '26' AS dept_dane, '26069' AS dane_code, 'San Andrés' AS name UNION ALL
  SELECT '26' AS dept_dane, '26070' AS dane_code, 'San Benito' AS name UNION ALL
  SELECT '26' AS dept_dane, '26071' AS dane_code, 'San Gil' AS name UNION ALL
  SELECT '26' AS dept_dane, '26072' AS dane_code, 'San Joaquín' AS name UNION ALL
  SELECT '26' AS dept_dane, '26073' AS dane_code, 'San José de Miranda' AS name UNION ALL
  SELECT '26' AS dept_dane, '26074' AS dane_code, 'San Miguel' AS name UNION ALL
  SELECT '26' AS dept_dane, '26075' AS dane_code, 'San Vicente de Chucurí' AS name UNION ALL
  SELECT '26' AS dept_dane, '26076' AS dane_code, 'Santa Bárbara' AS name UNION ALL
  SELECT '26' AS dept_dane, '26077' AS dane_code, 'Santa Helena del Opón' AS name UNION ALL
  SELECT '26' AS dept_dane, '26078' AS dane_code, 'Simacota' AS name UNION ALL
  SELECT '26' AS dept_dane, '26079' AS dane_code, 'Suaita' AS name UNION ALL
  SELECT '26' AS dept_dane, '26080' AS dane_code, 'Sucre' AS name UNION ALL
  SELECT '26' AS dept_dane, '26081' AS dane_code, 'Suratá' AS name UNION ALL
  SELECT '26' AS dept_dane, '26082' AS dane_code, 'Tona' AS name UNION ALL
  SELECT '26' AS dept_dane, '26083' AS dane_code, 'Valle de San José' AS name UNION ALL
  SELECT '26' AS dept_dane, '26084' AS dane_code, 'Vélez' AS name UNION ALL
  SELECT '26' AS dept_dane, '26085' AS dane_code, 'Vetas' AS name UNION ALL
  SELECT '26' AS dept_dane, '26086' AS dane_code, 'Villanueva' AS name UNION ALL
  SELECT '26' AS dept_dane, '26087' AS dane_code, 'Zapatoca' AS name UNION ALL
  SELECT '27' AS dept_dane, '27001' AS dane_code, 'Buenavista' AS name UNION ALL
  SELECT '27' AS dept_dane, '27002' AS dane_code, 'Caimito' AS name UNION ALL
  SELECT '27' AS dept_dane, '27003' AS dane_code, 'Chalán' AS name UNION ALL
  SELECT '27' AS dept_dane, '27004' AS dane_code, 'Colosó' AS name UNION ALL
  SELECT '27' AS dept_dane, '27005' AS dane_code, 'Corozal' AS name UNION ALL
  SELECT '27' AS dept_dane, '27006' AS dane_code, 'Coveñas' AS name UNION ALL
  SELECT '27' AS dept_dane, '27007' AS dane_code, 'El Roble' AS name UNION ALL
  SELECT '27' AS dept_dane, '27008' AS dane_code, 'Galeras' AS name UNION ALL
  SELECT '27' AS dept_dane, '27009' AS dane_code, 'Guaranda' AS name UNION ALL
  SELECT '27' AS dept_dane, '27010' AS dane_code, 'La Unión' AS name UNION ALL
  SELECT '27' AS dept_dane, '27011' AS dane_code, 'Los Palmitos' AS name UNION ALL
  SELECT '27' AS dept_dane, '27012' AS dane_code, 'Majagual' AS name UNION ALL
  SELECT '27' AS dept_dane, '27013' AS dane_code, 'Morroa' AS name UNION ALL
  SELECT '27' AS dept_dane, '27014' AS dane_code, 'Ovejas' AS name UNION ALL
  SELECT '27' AS dept_dane, '27015' AS dane_code, 'Sampués' AS name UNION ALL
  SELECT '27' AS dept_dane, '27016' AS dane_code, 'San Antonio de Palmito' AS name UNION ALL
  SELECT '27' AS dept_dane, '27017' AS dane_code, 'San Benito Abad' AS name UNION ALL
  SELECT '27' AS dept_dane, '27018' AS dane_code, 'San Juan de Betulia' AS name UNION ALL
  SELECT '27' AS dept_dane, '27019' AS dane_code, 'San Marcos' AS name UNION ALL
  SELECT '27' AS dept_dane, '27020' AS dane_code, 'San Onofre' AS name UNION ALL
  SELECT '27' AS dept_dane, '27021' AS dane_code, 'San Pedro' AS name UNION ALL
  SELECT '27' AS dept_dane, '27022' AS dane_code, 'Sincé' AS name UNION ALL
  SELECT '27' AS dept_dane, '27023' AS dane_code, 'Sincelejo' AS name UNION ALL
  SELECT '27' AS dept_dane, '27024' AS dane_code, 'Sucre' AS name UNION ALL
  SELECT '27' AS dept_dane, '27025' AS dane_code, 'Tolú' AS name UNION ALL
  SELECT '27' AS dept_dane, '27026' AS dane_code, 'Tolú Viejo' AS name UNION ALL
  SELECT '28' AS dept_dane, '28001' AS dane_code, 'Alpujarra' AS name UNION ALL
  SELECT '28' AS dept_dane, '28002' AS dane_code, 'Alvarado' AS name UNION ALL
  SELECT '28' AS dept_dane, '28003' AS dane_code, 'Ambalema' AS name UNION ALL
  SELECT '28' AS dept_dane, '28004' AS dane_code, 'Anzoátegui' AS name UNION ALL
  SELECT '28' AS dept_dane, '28005' AS dane_code, 'Armero' AS name UNION ALL
  SELECT '28' AS dept_dane, '28006' AS dane_code, 'Ataco' AS name UNION ALL
  SELECT '28' AS dept_dane, '28007' AS dane_code, 'Cajamarca' AS name UNION ALL
  SELECT '28' AS dept_dane, '28008' AS dane_code, 'Carmen de Apicalá' AS name UNION ALL
  SELECT '28' AS dept_dane, '28009' AS dane_code, 'Casabianca' AS name UNION ALL
  SELECT '28' AS dept_dane, '28010' AS dane_code, 'Chaparral' AS name UNION ALL
  SELECT '28' AS dept_dane, '28011' AS dane_code, 'Coello' AS name UNION ALL
  SELECT '28' AS dept_dane, '28012' AS dane_code, 'Coyaima' AS name UNION ALL
  SELECT '28' AS dept_dane, '28013' AS dane_code, 'Cunday' AS name UNION ALL
  SELECT '28' AS dept_dane, '28014' AS dane_code, 'Dolores' AS name UNION ALL
  SELECT '28' AS dept_dane, '28015' AS dane_code, 'El Espinal' AS name UNION ALL
  SELECT '28' AS dept_dane, '28016' AS dane_code, 'Falán' AS name UNION ALL
  SELECT '28' AS dept_dane, '28017' AS dane_code, 'Flandes' AS name UNION ALL
  SELECT '28' AS dept_dane, '28018' AS dane_code, 'Fresno' AS name UNION ALL
  SELECT '28' AS dept_dane, '28019' AS dane_code, 'Guamo' AS name UNION ALL
  SELECT '28' AS dept_dane, '28020' AS dane_code, 'Herveo' AS name UNION ALL
  SELECT '28' AS dept_dane, '28021' AS dane_code, 'Honda' AS name UNION ALL
  SELECT '28' AS dept_dane, '28022' AS dane_code, 'Ibagué' AS name UNION ALL
  SELECT '28' AS dept_dane, '28023' AS dane_code, 'Icononzo' AS name UNION ALL
  SELECT '28' AS dept_dane, '28024' AS dane_code, 'Lérida' AS name UNION ALL
  SELECT '28' AS dept_dane, '28025' AS dane_code, 'Líbano' AS name UNION ALL
  SELECT '28' AS dept_dane, '28026' AS dane_code, 'Mariquita' AS name UNION ALL
  SELECT '28' AS dept_dane, '28027' AS dane_code, 'Melgar' AS name UNION ALL
  SELECT '28' AS dept_dane, '28028' AS dane_code, 'Murillo' AS name UNION ALL
  SELECT '28' AS dept_dane, '28029' AS dane_code, 'Natagaima' AS name UNION ALL
  SELECT '28' AS dept_dane, '28030' AS dane_code, 'Ortega' AS name UNION ALL
  SELECT '28' AS dept_dane, '28031' AS dane_code, 'Palocabildo' AS name UNION ALL
  SELECT '28' AS dept_dane, '28032' AS dane_code, 'Piedras' AS name UNION ALL
  SELECT '28' AS dept_dane, '28033' AS dane_code, 'Planadas' AS name UNION ALL
  SELECT '28' AS dept_dane, '28034' AS dane_code, 'Prado' AS name UNION ALL
  SELECT '28' AS dept_dane, '28035' AS dane_code, 'Purificación' AS name UNION ALL
  SELECT '28' AS dept_dane, '28036' AS dane_code, 'Rioblanco' AS name UNION ALL
  SELECT '28' AS dept_dane, '28037' AS dane_code, 'Roncesvalles' AS name UNION ALL
  SELECT '28' AS dept_dane, '28038' AS dane_code, 'Rovira' AS name UNION ALL
  SELECT '28' AS dept_dane, '28039' AS dane_code, 'Saldaña' AS name UNION ALL
  SELECT '28' AS dept_dane, '28040' AS dane_code, 'San Antonio' AS name UNION ALL
  SELECT '28' AS dept_dane, '28041' AS dane_code, 'San Luis' AS name UNION ALL
  SELECT '28' AS dept_dane, '28042' AS dane_code, 'Santa Isabel' AS name UNION ALL
  SELECT '28' AS dept_dane, '28043' AS dane_code, 'Suárez' AS name UNION ALL
  SELECT '28' AS dept_dane, '28044' AS dane_code, 'Valle de San Juan' AS name UNION ALL
  SELECT '28' AS dept_dane, '28045' AS dane_code, 'Venadillo' AS name UNION ALL
  SELECT '28' AS dept_dane, '28046' AS dane_code, 'Villahermosa' AS name UNION ALL
  SELECT '28' AS dept_dane, '28047' AS dane_code, 'Villarrica' AS name UNION ALL
  SELECT '29' AS dept_dane, '29001' AS dane_code, 'Alcalá' AS name UNION ALL
  SELECT '29' AS dept_dane, '29002' AS dane_code, 'Andalucía' AS name UNION ALL
  SELECT '29' AS dept_dane, '29003' AS dane_code, 'Ansermanuevo' AS name UNION ALL
  SELECT '29' AS dept_dane, '29004' AS dane_code, 'Argelia' AS name UNION ALL
  SELECT '29' AS dept_dane, '29005' AS dane_code, 'Bolívar' AS name UNION ALL
  SELECT '29' AS dept_dane, '29006' AS dane_code, 'Buenaventura' AS name UNION ALL
  SELECT '29' AS dept_dane, '29007' AS dane_code, 'Buga' AS name UNION ALL
  SELECT '29' AS dept_dane, '29008' AS dane_code, 'Bugalagrande' AS name UNION ALL
  SELECT '29' AS dept_dane, '29009' AS dane_code, 'Caicedonia' AS name UNION ALL
  SELECT '29' AS dept_dane, '29010' AS dane_code, 'Cali' AS name UNION ALL
  SELECT '29' AS dept_dane, '29011' AS dane_code, 'Calima' AS name UNION ALL
  SELECT '29' AS dept_dane, '29012' AS dane_code, 'Candelaria' AS name UNION ALL
  SELECT '29' AS dept_dane, '29013' AS dane_code, 'Cartago' AS name UNION ALL
  SELECT '29' AS dept_dane, '29014' AS dane_code, 'Dagua' AS name UNION ALL
  SELECT '29' AS dept_dane, '29015' AS dane_code, 'El Águila' AS name UNION ALL
  SELECT '29' AS dept_dane, '29016' AS dane_code, 'El Cairo' AS name UNION ALL
  SELECT '29' AS dept_dane, '29017' AS dane_code, 'El Cerrito' AS name UNION ALL
  SELECT '29' AS dept_dane, '29018' AS dane_code, 'El Dovio' AS name UNION ALL
  SELECT '29' AS dept_dane, '29019' AS dane_code, 'Florida' AS name UNION ALL
  SELECT '29' AS dept_dane, '29020' AS dane_code, 'Ginebra' AS name UNION ALL
  SELECT '29' AS dept_dane, '29021' AS dane_code, 'Guacarí' AS name UNION ALL
  SELECT '29' AS dept_dane, '29022' AS dane_code, 'Jamundí' AS name UNION ALL
  SELECT '29' AS dept_dane, '29023' AS dane_code, 'La Cumbre' AS name UNION ALL
  SELECT '29' AS dept_dane, '29024' AS dane_code, 'La Unión' AS name UNION ALL
  SELECT '29' AS dept_dane, '29025' AS dane_code, 'La Victoria' AS name UNION ALL
  SELECT '29' AS dept_dane, '29026' AS dane_code, 'Obando' AS name UNION ALL
  SELECT '29' AS dept_dane, '29027' AS dane_code, 'Palmira' AS name UNION ALL
  SELECT '29' AS dept_dane, '29028' AS dane_code, 'Pradera' AS name UNION ALL
  SELECT '29' AS dept_dane, '29029' AS dane_code, 'Restrepo' AS name UNION ALL
  SELECT '29' AS dept_dane, '29030' AS dane_code, 'Riofrío' AS name UNION ALL
  SELECT '29' AS dept_dane, '29031' AS dane_code, 'Roldanillo' AS name UNION ALL
  SELECT '29' AS dept_dane, '29032' AS dane_code, 'San Pedro' AS name UNION ALL
  SELECT '29' AS dept_dane, '29033' AS dane_code, 'Sevilla' AS name UNION ALL
  SELECT '29' AS dept_dane, '29034' AS dane_code, 'Toro' AS name UNION ALL
  SELECT '29' AS dept_dane, '29035' AS dane_code, 'Trujillo' AS name UNION ALL
  SELECT '29' AS dept_dane, '29036' AS dane_code, 'Tuluá' AS name UNION ALL
  SELECT '29' AS dept_dane, '29037' AS dane_code, 'Ulloa' AS name UNION ALL
  SELECT '29' AS dept_dane, '29038' AS dane_code, 'Versalles' AS name UNION ALL
  SELECT '29' AS dept_dane, '29039' AS dane_code, 'Vijes' AS name UNION ALL
  SELECT '29' AS dept_dane, '29040' AS dane_code, 'Yotoco' AS name UNION ALL
  SELECT '29' AS dept_dane, '29041' AS dane_code, 'Yumbo' AS name UNION ALL
  SELECT '29' AS dept_dane, '29042' AS dane_code, 'Zarzal' AS name UNION ALL
  SELECT '30' AS dept_dane, '30001' AS dane_code, 'Carurú' AS name UNION ALL
  SELECT '30' AS dept_dane, '30002' AS dane_code, 'Mitú' AS name UNION ALL
  SELECT '30' AS dept_dane, '30003' AS dane_code, 'Taraira' AS name UNION ALL
  SELECT '31' AS dept_dane, '31001' AS dane_code, 'Cumaribo' AS name UNION ALL
  SELECT '31' AS dept_dane, '31002' AS dane_code, 'La Primavera' AS name UNION ALL
  SELECT '31' AS dept_dane, '31003' AS dane_code, 'Puerto Carreño' AS name UNION ALL
  SELECT '31' AS dept_dane, '31004' AS dane_code, 'Santa Rosalía' AS name
) v
JOIN departments d ON d.dane_code = v.dept_dane;
