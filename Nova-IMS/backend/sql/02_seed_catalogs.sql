-- =====================================================================
-- gestionincidentes — catálogos base (estructura operativa)
-- Nova-IMS backend
--
-- Ejecutar después de 01_schema.sql.
-- NO incluye: geo, correos, usuarios ni datos operativos (viven en la BD del cliente).
-- =====================================================================

USE gestionincidentes;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET @seed_pol_created_at = '2026-05-29 10:06:43';
-- ---- agencias ----
--
-- Dumping data for table `agencias`
--

LOCK TABLES `agencias` WRITE;
/*!40000 ALTER TABLE `agencias` DISABLE KEYS */;
INSERT INTO `agencias` VALUES ('CRU','CRUE','Centro Regulador de Urgencias y Emergencias en Salud - CRUE','2026-05-29 10:06:42'),('CSJ','Consejo Superior De La Judicatura','Órgano colombiano de administración y gobierno de la Rama Judicial de Colombia','2026-06-03 12:10:03'),('POL','Policia','Policia Nacional de colombia','2026-05-29 10:06:42');
/*!40000 ALTER TABLE `agencias` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- contador_incidente_visible ----
--
-- Dumping data for table `contador_incidente_visible`
--

LOCK TABLES `contador_incidente_visible` WRITE;
/*!40000 ALTER TABLE `contador_incidente_visible` DISABLE KEYS */;
INSERT INTO `contador_incidente_visible` VALUES (2025,1),(2026,5);
/*!40000 ALTER TABLE `contador_incidente_visible` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- correosincidentes ----
--
-- Sin datos iniciales: los correos autorizados se gestionan en Administración.
--

LOCK TABLES `correosincidentes` WRITE;
/*!40000 ALTER TABLE `correosincidentes` DISABLE KEYS */;
/*!40000 ALTER TABLE `correosincidentes` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- estadosincidentes ----
--
-- Dumping data for table `estadosincidentes`
--

LOCK TABLES `estadosincidentes` WRITE;
/*!40000 ALTER TABLE `estadosincidentes` DISABLE KEYS */;
INSERT INTO `estadosincidentes` VALUES (1,'POL','Abierto','Incidente recién creado',@seed_pol_created_at),(2,'POL','En espera','Incidente esperando asignación',@seed_pol_created_at),(3,'POL','Asignado','Incidente asignado a una patrulla',@seed_pol_created_at),(4,'POL','En proceso','Incidente en atención activa',@seed_pol_created_at),(5,'POL','Cerrado','Incidente finalizado y resuelto',@seed_pol_created_at),(6,'POL','Cancelado','Incidente cancelado sin resolver',@seed_pol_created_at);
/*!40000 ALTER TABLE `estadosincidentes` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- eventos ----
--
-- Dumping data for table `eventos`
--

LOCK TABLES `eventos` WRITE;
/*!40000 ALTER TABLE `eventos` DISABLE KEYS */;
INSERT INTO `eventos` VALUES (1,'POL','Disparos','911',@seed_pol_created_at,1),(2,'POL','Accidente de tránsito','Accidente',@seed_pol_created_at,1),(3,'CSJ','Amenaza contra juez o magistrado','Amenaza','2026-06-07 11:50:38',1),(4,'CSJ','Seguimiento o vigilancia a funcionario judicial','Vigilancia','2026-06-07 11:50:38',1),(5,'CSJ','Atentado o agresión física a funcionario judicial','Agresión','2026-06-07 11:50:38',1),(6,'CSJ','Extorsión a funcionario judicial','Extorsión','2026-06-07 11:50:38',1),(7,'CSJ','Acceso no autorizado a despacho judicial','Acceso indebido','2026-06-07 11:50:38',1),(8,'CSJ','Artefacto explosivo o sospechoso en sede','Explosivo','2026-06-07 11:50:38',1),(9,'CSJ','Vandalismo en instalaciones judiciales','Vandalismo','2026-06-07 11:50:38',2),(10,'CSJ','Incendio o emergencia en sede judicial','Emergencia','2026-06-07 11:50:38',1),(11,'CSJ','Hurto o destrucción de expedientes judiciales','Hurto','2026-06-07 11:50:38',1),(12,'CSJ','Interceptación de comunicaciones judiciales','Interceptación','2026-06-07 11:50:38',1),(13,'CSJ','Suplantación de funcionario judicial','Fraude','2026-06-07 11:50:38',1),(14,'CSJ','Fuga de información reservada','Fuga de información','2026-06-07 11:50:38',1),(15,'CSJ','Disturbio en audiencia pública','Disturbio','2026-06-07 11:50:38',2),(16,'CSJ','Ingreso de armas a sala de audiencias','Armas','2026-06-07 11:50:38',1),(17,'CSJ','Agresión entre partes procesales','Agresión entre partes','2026-06-07 11:50:38',2),(18,'CSJ','Desacato con alteración del orden','Desacato','2026-06-07 11:50:38',2),(19,'CSJ','Amenaza a testigos o víctimas','Amenaza a testigos','2026-06-07 11:50:38',1),(20,'CSJ','Coacción a jurado o perito','Coacción','2026-06-07 11:50:38',1),(21,'CSJ','Presión indebida sobre decisiones judiciales','Presión judicial','2026-06-07 11:50:38',1);
/*!40000 ALTER TABLE `eventos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- genero ----
--
-- Dumping data for table `genero`
--

LOCK TABLES `genero` WRITE;
/*!40000 ALTER TABLE `genero` DISABLE KEYS */;
INSERT INTO `genero` VALUES (1,'Femenino','2026-06-04 15:37:45','csj'),(2,'Masculino','2026-06-04 15:37:45','csj'),(3,'No Binario','2026-06-04 15:37:45','csj'),(4,'Trans','2026-06-04 15:37:45','csj'),(5,'No Se Identifica','2026-06-04 15:37:45','csj'),(6,'Femenino','2026-06-04 15:38:23','pol'),(7,'Masculino','2026-06-04 15:38:23','pol'),(8,'No Binario','2026-06-04 15:38:23','pol'),(9,'Trans','2026-06-04 15:38:23','pol'),(10,'No Se Identifica','2026-06-04 15:38:23','pol');
/*!40000 ALTER TABLE `genero` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- modules ----
--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
INSERT INTO `modules` VALUES (4,'Administración'),(1,'Dashboard'),(2,'Incidentes'),(3,'Reportes');
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- origen ----
--
-- Dumping data for table `origen`
--

LOCK TABLES `origen` WRITE;
/*!40000 ALTER TABLE `origen` DISABLE KEYS */;
INSERT INTO `origen` VALUES (1,'Llamada 123','Llamada de emergencia al 123','POL',@seed_pol_created_at);
/*!40000 ALTER TABLE `origen` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- pasosprotocolo ----
--
-- Dumping data for table `pasosprotocolo`
--

LOCK TABLES `pasosprotocolo` WRITE;
/*!40000 ALTER TABLE `pasosprotocolo` DISABLE KEYS */;
INSERT INTO `pasosprotocolo` VALUES (1,1,1,'Verificar lesionados y neutralizar tirador',@seed_pol_created_at),(2,1,2,'Acordonar el área',@seed_pol_created_at);
/*!40000 ALTER TABLE `pasosprotocolo` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- permisos ----
--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` VALUES (1,'VER_INCIDENTES','Permiso para visualizar incidentes',@seed_pol_created_at);
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- permisos_de_rol ----
--
-- Dumping data for table `permisos_de_rol`
--

LOCK TABLES `permisos_de_rol` WRITE;
/*!40000 ALTER TABLE `permisos_de_rol` DISABLE KEYS */;
SET @perm_role_rp_1 = 'RP-1';
SET @perm_role_rp_2 = 'RP-2';
SET @perm_role_rp_3 = 'RP-3';
SET @perm_role_rp_4 = 'RP-4';
SET @perm_role_rp_5 = 'RP-5';
SET @perm_role_rp_6 = 'RP-6';
SET @perm_role_rp_8 = 'RP-8';
SET @perm_role_rp_9 = 'RP-9';
SET @perm_role_rp_10 = 'RP-10';
SET @perm_role_rp_11 = 'RP-11';
SET @perm_role_rp_12 = 'RP-12';
SET @perm_role_rp_13 = 'RP-13';
SET @perm_agency_csj = 'csj';
SET @perm_agency_pol = 'pol';
INSERT INTO `permisos_de_rol` (`id_permiso`, `id_rol`, `ID_Agencia`, `module_id`, `enabled`, `can_view`, `can_create`, `can_edit`, `can_delete`) VALUES
(1, @perm_role_rp_1, @perm_agency_csj, 1, 1, 1, 1, 1, 1),
(2, @perm_role_rp_1, @perm_agency_csj, 2, 1, 1, 1, 1, 1),
(3, @perm_role_rp_1, @perm_agency_csj, 3, 1, 1, 1, 1, 1),
(4, @perm_role_rp_1, @perm_agency_csj, 4, 1, 1, 1, 1, 1),
(5, @perm_role_rp_2, @perm_agency_csj, 1, 1, 1, 1, 1, 0),
(6, @perm_role_rp_2, @perm_agency_csj, 2, 1, 1, 1, 1, 0),
(7, @perm_role_rp_2, @perm_agency_csj, 3, 1, 1, 0, 0, 0),
(8, @perm_role_rp_2, @perm_agency_csj, 4, 0, 0, 0, 0, 0),
(9, @perm_role_rp_3, @perm_agency_csj, 1, 1, 1, 0, 0, 0),
(10, @perm_role_rp_3, @perm_agency_csj, 2, 1, 1, 1, 1, 0),
(11, @perm_role_rp_3, @perm_agency_csj, 3, 0, 0, 0, 0, 0),
(12, @perm_role_rp_3, @perm_agency_csj, 4, 0, 0, 0, 0, 0),
(13, @perm_role_rp_4, @perm_agency_csj, 1, 1, 1, 0, 0, 0),
(14, @perm_role_rp_4, @perm_agency_csj, 2, 1, 1, 0, 1, 0),
(15, @perm_role_rp_4, @perm_agency_csj, 3, 0, 0, 0, 0, 0),
(16, @perm_role_rp_4, @perm_agency_csj, 4, 0, 0, 0, 0, 0),
(17, @perm_role_rp_5, @perm_agency_csj, 1, 1, 1, 0, 0, 0),
(18, @perm_role_rp_5, @perm_agency_csj, 2, 1, 1, 0, 0, 0),
(19, @perm_role_rp_5, @perm_agency_csj, 3, 1, 1, 0, 0, 0),
(20, @perm_role_rp_5, @perm_agency_csj, 4, 0, 0, 0, 0, 0),
(21, @perm_role_rp_6, @perm_agency_csj, 1, 1, 1, 0, 0, 0),
(22, @perm_role_rp_6, @perm_agency_csj, 2, 1, 1, 0, 0, 0),
(23, @perm_role_rp_6, @perm_agency_csj, 3, 1, 1, 0, 0, 0),
(24, @perm_role_rp_6, @perm_agency_csj, 4, 0, 0, 0, 0, 0),
(49, @perm_role_rp_8, @perm_agency_pol, 1, 1, 1, 1, 1, 1),
(50, @perm_role_rp_8, @perm_agency_pol, 2, 1, 1, 1, 1, 1),
(51, @perm_role_rp_8, @perm_agency_pol, 3, 1, 1, 1, 1, 1),
(52, @perm_role_rp_8, @perm_agency_pol, 4, 1, 1, 1, 1, 1),
(53, @perm_role_rp_9, @perm_agency_pol, 1, 1, 1, 1, 1, 0),
(54, @perm_role_rp_9, @perm_agency_pol, 2, 1, 1, 1, 1, 0),
(55, @perm_role_rp_9, @perm_agency_pol, 3, 1, 1, 0, 0, 0),
(56, @perm_role_rp_9, @perm_agency_pol, 4, 0, 0, 0, 0, 0),
(57, @perm_role_rp_10, @perm_agency_pol, 1, 1, 1, 0, 0, 0),
(58, @perm_role_rp_10, @perm_agency_pol, 2, 1, 1, 1, 1, 0),
(59, @perm_role_rp_10, @perm_agency_pol, 3, 0, 0, 0, 0, 0),
(60, @perm_role_rp_10, @perm_agency_pol, 4, 0, 0, 0, 0, 0),
(61, @perm_role_rp_11, @perm_agency_pol, 1, 1, 1, 0, 0, 0),
(62, @perm_role_rp_11, @perm_agency_pol, 2, 1, 1, 0, 1, 0),
(63, @perm_role_rp_11, @perm_agency_pol, 3, 0, 0, 0, 0, 0),
(64, @perm_role_rp_11, @perm_agency_pol, 4, 0, 0, 0, 0, 0),
(65, @perm_role_rp_12, @perm_agency_pol, 1, 1, 1, 0, 0, 0),
(66, @perm_role_rp_12, @perm_agency_pol, 2, 1, 1, 0, 0, 0),
(67, @perm_role_rp_12, @perm_agency_pol, 3, 1, 1, 0, 0, 0),
(68, @perm_role_rp_12, @perm_agency_pol, 4, 0, 0, 0, 0, 0),
(69, @perm_role_rp_13, @perm_agency_pol, 1, 1, 1, 0, 0, 0),
(70, @perm_role_rp_13, @perm_agency_pol, 2, 1, 1, 0, 0, 0),
(71, @perm_role_rp_13, @perm_agency_pol, 3, 1, 1, 0, 0, 0),
(72, @perm_role_rp_13, @perm_agency_pol, 4, 0, 0, 0, 0, 0);
/*!40000 ALTER TABLE `permisos_de_rol` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- prioridades ----
--
-- Dumping data for table `prioridades`
--

LOCK TABLES `prioridades` WRITE;
/*!40000 ALTER TABLE `prioridades` DISABLE KEYS */;
INSERT INTO `prioridades` VALUES (1,'Alta','Requiere atención inmediata - responder en menos de 15 minutos',@seed_pol_created_at),(2,'Media','Puede esperar breve tiempo - responder en menos de 1 hora',@seed_pol_created_at),(3,'Baja','No es urgente - responder en menos de 24 horas',@seed_pol_created_at);
/*!40000 ALTER TABLE `prioridades` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- protocolos ----
--
-- Dumping data for table `protocolos`
--

LOCK TABLES `protocolos` WRITE;
/*!40000 ALTER TABLE `protocolos` DISABLE KEYS */;
INSERT INTO `protocolos` VALUES (1,'PROT_911',1,'POL','Protocolo para atención de disparon',@seed_pol_created_at);
/*!40000 ALTER TABLE `protocolos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- riesgos ----
--
-- Dumping data for table `riesgos`
--

LOCK TABLES `riesgos` WRITE;
/*!40000 ALTER TABLE `riesgos` DISABLE KEYS */;
INSERT INTO `riesgos` VALUES (1,'Ordinario','Riesgo de nivel ordinario según clasificación institucional','CSJ','2026-06-05 15:16:41'),(2,'Extraordinario','Riesgo de nivel extraordinario que requiere atención especial','CSJ','2026-06-05 15:16:41'),(3,'Ordinario','Riesgo de nivel ordinario según clasificación policial','POL','2026-06-05 15:16:41'),(4,'Extraordinario','Riesgo de nivel extraordinario que requiere intervención prioritaria','POL','2026-06-05 15:16:41');
/*!40000 ALTER TABLE `riesgos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- roles ----
--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('RP-1','Administrador del sistema','csj','Control total del sistema','2026-06-04 16:49:15'),('RP-10','Operador / Despachador','pol','Crea y actualiza incidentes','2026-06-04 16:49:15'),('RP-11','Unidad / Agente de campo','pol','Atiende y actualiza en terreno','2026-06-04 16:49:15'),('RP-12','Analista / Informes','pol','Consulta reportes e indicadores','2026-06-04 16:49:15'),('RP-13','Usuario Consulta','pol','Solo lectura','2026-06-04 16:49:15'),('RP-2','Supervisor / Coordinador','csj','Gestiona equipos y aprueba cambios','2026-06-04 16:49:15'),('RP-3','Operador / Despachador','csj','Crea y actualiza incidentes','2026-06-04 16:49:15'),('RP-4','Unidad / Agente de campo','csj','Atiende y actualiza en terreno','2026-06-04 16:49:15'),('RP-5','Analista / Informes','csj','Consulta reportes e indicadores','2026-06-04 16:49:15'),('RP-6','Usuario Consulta','csj','Solo lectura','2026-06-04 16:49:15'),('RP-8','Administrador del sistema','pol','Control total del sistema','2026-06-04 16:49:15'),('RP-9','Supervisor / Coordinador','pol','Gestiona equipos y aprueba cambios','2026-06-04 16:49:15');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- roles_lugar ----
--
-- Dumping data for table `roles_lugar`
--

LOCK TABLES `roles_lugar` WRITE;
/*!40000 ALTER TABLE `roles_lugar` DISABLE KEYS */;
INSERT INTO `roles_lugar` VALUES (1,'Vivienda_Particular','Casa o apartamento de una persona natural','CSJ'),(2,'Casa_Magistrado','Residencia particular de un magistrado','CSJ'),(3,'Hotel','Establecimiento de hospedaje','CSJ'),(4,'Oficina_Privada','Oficina de empresa privada','CSJ'),(5,'Via_Publica','Calle, carrera, avenida o vía pública','CSJ'),(6,'Sede_Judicial','Palacio de justicia, juzgado o tribunal','CSJ'),(7,'Vehiculo_Particular','Automóvil particular como lugar del incidente','CSJ'),(8,'Restaurante','Establecimiento de comidas','CSJ'),(9,'Centro_Comercial','Centro comercial','CSJ'),(10,'Banco','Entidad financiera','CSJ');
/*!40000 ALTER TABLE `roles_lugar` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- rolesvehiculo ----
--
-- Dumping data for table `rolesvehiculo`
--

LOCK TABLES `rolesvehiculo` WRITE;
/*!40000 ALTER TABLE `rolesvehiculo` DISABLE KEYS */;
INSERT INTO `rolesvehiculo` VALUES (1,'Implicado','Vehículo involucrado en el incidente','POL',@seed_pol_created_at),(2,'Afectado','Vehículo con daños','POL',@seed_pol_created_at),(3,'Testigo','Vehículo que presencia el incidente','POL',@seed_pol_created_at);
/*!40000 ALTER TABLE `rolesvehiculo` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- rolpersonas ----
--
-- Dumping data for table `rolpersonas`
--

LOCK TABLES `rolpersonas` WRITE;
/*!40000 ALTER TABLE `rolpersonas` DISABLE KEYS */;
INSERT INTO `rolpersonas` VALUES (1,'Ordinario','Rol ordinario para personas según clasificación institucional','CSJ','2026-06-05 12:22:05'),(2,'Extraordinario','Rol extraordinario que requiere atención especial','CSJ','2026-06-05 12:22:05'),(3,'Ordinario','Rol ordinario para personas según clasificación institucional','POL','2026-06-05 12:23:10'),(4,'Extraordinario','Rol extraordinario que requiere atención especial','POL','2026-06-05 12:23:10');
/*!40000 ALTER TABLE `rolpersonas` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- tipodocumentos ----
--
-- Dumping data for table `tipodocumentos`
--

LOCK TABLES `tipodocumentos` WRITE;
/*!40000 ALTER TABLE `tipodocumentos` DISABLE KEYS */;
INSERT INTO `tipodocumentos` VALUES ('CC','Cédula de ciudadanía',@seed_pol_created_at),('CE','Cédula de extranjería',@seed_pol_created_at),('NIT','Número de identificación tributaria',@seed_pol_created_at),('PA','Pasaporte',@seed_pol_created_at),('TI','Tarjeta de identidad',@seed_pol_created_at);
/*!40000 ALTER TABLE `tipodocumentos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- tipovehiculo ----
--
-- Dumping data for table `tipovehiculo`
--

LOCK TABLES `tipovehiculo` WRITE;
/*!40000 ALTER TABLE `tipovehiculo` DISABLE KEYS */;
INSERT INTO `tipovehiculo` VALUES (1,'Automóvil','Vehículo particular de 4 ruedas','POL',@seed_pol_created_at),(2,'Motocicleta','Motocicleta o ciclomotor de 2 ruedas','POL',@seed_pol_created_at),(3,'Camión','Vehículo de carga pesada','POL',@seed_pol_created_at),(4,'Bicicleta','Vehículo de tracción humana','POL',@seed_pol_created_at),(5,'Bus','Transporte público de pasajeros','POL',@seed_pol_created_at);
/*!40000 ALTER TABLE `tipovehiculo` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- usuarios ----
--
-- Sin datos iniciales: los operadores se crean en Administración (API /operators).
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
