-- =====================================================================
-- gestionincidentes — catálogos de referencia (listas base para la aplicación)
-- Nova-IMS backend
--
-- Ejecutar después de 01_schema.sql.
-- Datos de referencia: agencias, roles, permisos, tipos de evento, prioridades, etc.
-- NO incluye: geo, correos, usuarios ni incidentes (viven en la BD / dump del cliente).
-- =====================================================================

USE gestionincidentes;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET @seed_pol_created_at = '2026-05-29 10:06:43';
SET @seed_agency_csj = 'csj';
SET @seed_agency_pol = 'pol';
SET @seed_genero_csj_at = '2026-06-04 15:37:45';
SET @seed_genero_pol_at = '2026-06-04 15:38:23';
SET @seed_csj_events_at = '2026-06-07 11:50:38';
SET @seed_roles_at = '2026-06-04 16:49:15';
SET @seed_clasificacion_ordinario = 'Ordinario';
SET @seed_clasificacion_extraordinario = 'Extraordinario';
SET @seed_riesgos_at = '2026-06-05 15:16:41';
SET @seed_agency_csj_upper = 'CSJ';
SET @seed_agency_pol_upper = 'POL';
SET @seed_rolpersonas_csj_at = '2026-06-05 12:22:05';
SET @seed_rolpersonas_pol_at = '2026-06-05 12:23:10';
SET @seed_rolpersona_ordinario_desc = 'Rol ordinario para personas según clasificación institucional';
SET @seed_rolpersona_extraordinario_desc = 'Rol extraordinario que requiere atención especial';
SET @seed_agencies_pol_at = '2026-05-29 10:06:42';
-- ---- agencias ----
--
-- Dumping data for table `agencias`
--

LOCK TABLES `agencias` WRITE;
/*!40000 ALTER TABLE `agencias` DISABLE KEYS */;
INSERT INTO `agencias` VALUES ('CRU','CRUE','Centro Regulador de Urgencias y Emergencias en Salud - CRUE',@seed_agencies_pol_at),(@seed_agency_csj_upper,'Consejo Superior De La Judicatura','Órgano colombiano de administración y gobierno de la Rama Judicial de Colombia','2026-06-03 12:10:03'),(@seed_agency_pol_upper,'Policia','Policia Nacional de colombia',@seed_agencies_pol_at);
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
INSERT INTO `estadosincidentes` VALUES (1,@seed_agency_pol_upper,'Abierto','Incidente recién creado',@seed_pol_created_at),(2,@seed_agency_pol_upper,'En espera','Incidente esperando asignación',@seed_pol_created_at),(3,@seed_agency_pol_upper,'Asignado','Incidente asignado a una patrulla',@seed_pol_created_at),(4,@seed_agency_pol_upper,'En proceso','Incidente en atención activa',@seed_pol_created_at),(5,@seed_agency_pol_upper,'Cerrado','Incidente finalizado y resuelto',@seed_pol_created_at),(6,@seed_agency_pol_upper,'Cancelado','Incidente cancelado sin resolver',@seed_pol_created_at);
/*!40000 ALTER TABLE `estadosincidentes` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- eventos ----
--
-- Dumping data for table `eventos`
--

LOCK TABLES `eventos` WRITE;
/*!40000 ALTER TABLE `eventos` DISABLE KEYS */;
INSERT INTO `eventos` VALUES (1,@seed_agency_pol_upper,'Disparos','911',@seed_pol_created_at,1),(2,@seed_agency_pol_upper,'Accidente de tránsito','Accidente',@seed_pol_created_at,1),(3,@seed_agency_csj_upper,'Amenaza contra juez o magistrado','Amenaza',@seed_csj_events_at,1),(4,@seed_agency_csj_upper,'Seguimiento o vigilancia a funcionario judicial','Vigilancia',@seed_csj_events_at,1),(5,@seed_agency_csj_upper,'Atentado o agresión física a funcionario judicial','Agresión',@seed_csj_events_at,1),(6,@seed_agency_csj_upper,'Extorsión a funcionario judicial','Extorsión',@seed_csj_events_at,1),(7,@seed_agency_csj_upper,'Acceso no autorizado a despacho judicial','Acceso indebido',@seed_csj_events_at,1),(8,@seed_agency_csj_upper,'Artefacto explosivo o sospechoso en sede','Explosivo',@seed_csj_events_at,1),(9,@seed_agency_csj_upper,'Vandalismo en instalaciones judiciales','Vandalismo',@seed_csj_events_at,2),(10,@seed_agency_csj_upper,'Incendio o emergencia en sede judicial','Emergencia',@seed_csj_events_at,1),(11,@seed_agency_csj_upper,'Hurto o destrucción de expedientes judiciales','Hurto',@seed_csj_events_at,1),(12,@seed_agency_csj_upper,'Interceptación de comunicaciones judiciales','Interceptación',@seed_csj_events_at,1),(13,@seed_agency_csj_upper,'Suplantación de funcionario judicial','Fraude',@seed_csj_events_at,1),(14,@seed_agency_csj_upper,'Fuga de información reservada','Fuga de información',@seed_csj_events_at,1),(15,@seed_agency_csj_upper,'Disturbio en audiencia pública','Disturbio',@seed_csj_events_at,2),(16,@seed_agency_csj_upper,'Ingreso de armas a sala de audiencias','Armas',@seed_csj_events_at,1),(17,@seed_agency_csj_upper,'Agresión entre partes procesales','Agresión entre partes',@seed_csj_events_at,2),(18,@seed_agency_csj_upper,'Desacato con alteración del orden','Desacato',@seed_csj_events_at,2),(19,@seed_agency_csj_upper,'Amenaza a testigos o víctimas','Amenaza a testigos',@seed_csj_events_at,1),(20,@seed_agency_csj_upper,'Coacción a jurado o perito','Coacción',@seed_csj_events_at,1),(21,@seed_agency_csj_upper,'Presión indebida sobre decisiones judiciales','Presión judicial',@seed_csj_events_at,1);
/*!40000 ALTER TABLE `eventos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- genero ----
--
-- Dumping data for table `genero`
--

LOCK TABLES `genero` WRITE;
/*!40000 ALTER TABLE `genero` DISABLE KEYS */;
INSERT INTO `genero` VALUES (1,'Femenino',@seed_genero_csj_at,@seed_agency_csj),(2,'Masculino',@seed_genero_csj_at,@seed_agency_csj),(3,'No Binario',@seed_genero_csj_at,@seed_agency_csj),(4,'Trans',@seed_genero_csj_at,@seed_agency_csj),(5,'No Se Identifica',@seed_genero_csj_at,@seed_agency_csj),(6,'Femenino',@seed_genero_pol_at,@seed_agency_pol),(7,'Masculino',@seed_genero_pol_at,@seed_agency_pol),(8,'No Binario',@seed_genero_pol_at,@seed_agency_pol),(9,'Trans',@seed_genero_pol_at,@seed_agency_pol),(10,'No Se Identifica',@seed_genero_pol_at,@seed_agency_pol);
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
INSERT INTO `origen` VALUES (1,'Llamada 123','Llamada de emergencia al 123',@seed_agency_pol_upper,@seed_pol_created_at);
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
SET @perm_agency_csj = @seed_agency_csj;
SET @perm_agency_pol = @seed_agency_pol;
INSERT INTO `permisos_de_rol` (`id_permiso`, `id_rol`, `id_agencia`, `id_modulo`, `habilitado`, `puede_ver`, `puede_crear`, `puede_editar`, `puede_archivar`) VALUES
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
INSERT INTO `protocolos` VALUES (1,'PROT_911',1,@seed_agency_pol_upper,'Protocolo para atención de disparon',@seed_pol_created_at);
/*!40000 ALTER TABLE `protocolos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- riesgos ----
--
-- Dumping data for table `riesgos`
--

LOCK TABLES `riesgos` WRITE;
/*!40000 ALTER TABLE `riesgos` DISABLE KEYS */;
INSERT INTO `riesgos` VALUES (1,@seed_clasificacion_ordinario,'Riesgo de nivel ordinario según clasificación institucional',@seed_agency_csj_upper,@seed_riesgos_at),(2,@seed_clasificacion_extraordinario,'Riesgo de nivel extraordinario que requiere atención especial',@seed_agency_csj_upper,@seed_riesgos_at),(3,@seed_clasificacion_ordinario,'Riesgo de nivel ordinario según clasificación policial',@seed_agency_pol_upper,@seed_riesgos_at),(4,@seed_clasificacion_extraordinario,'Riesgo de nivel extraordinario que requiere intervención prioritaria',@seed_agency_pol_upper,@seed_riesgos_at);
/*!40000 ALTER TABLE `riesgos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- roles ----
--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('RP-1','Administrador del sistema',@seed_agency_csj,'Control total del sistema',@seed_roles_at),('RP-10','Operador / Despachador',@seed_agency_pol,'Crea y actualiza incidentes',@seed_roles_at),('RP-11','Unidad / Agente de campo',@seed_agency_pol,'Atiende y actualiza en terreno',@seed_roles_at),('RP-12','Analista / Informes',@seed_agency_pol,'Consulta reportes e indicadores',@seed_roles_at),('RP-13','Usuario Consulta',@seed_agency_pol,'Solo lectura',@seed_roles_at),('RP-2','Supervisor / Coordinador',@seed_agency_csj,'Gestiona equipos y aprueba cambios',@seed_roles_at),('RP-3','Operador / Despachador',@seed_agency_csj,'Crea y actualiza incidentes',@seed_roles_at),('RP-4','Unidad / Agente de campo',@seed_agency_csj,'Atiende y actualiza en terreno',@seed_roles_at),('RP-5','Analista / Informes',@seed_agency_csj,'Consulta reportes e indicadores',@seed_roles_at),('RP-6','Usuario Consulta',@seed_agency_csj,'Solo lectura',@seed_roles_at),('RP-8','Administrador del sistema',@seed_agency_pol,'Control total del sistema',@seed_roles_at),('RP-9','Supervisor / Coordinador',@seed_agency_pol,'Gestiona equipos y aprueba cambios',@seed_roles_at);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- roles_lugar ----
--
-- Dumping data for table `roles_lugar`
--

LOCK TABLES `roles_lugar` WRITE;
/*!40000 ALTER TABLE `roles_lugar` DISABLE KEYS */;
INSERT INTO `roles_lugar` VALUES (1,'Vivienda_Particular','Casa o apartamento de una persona natural',@seed_agency_csj_upper),(2,'Casa_Magistrado','Residencia particular de un magistrado',@seed_agency_csj_upper),(3,'Hotel','Establecimiento de hospedaje',@seed_agency_csj_upper),(4,'Oficina_Privada','Oficina de empresa privada',@seed_agency_csj_upper),(5,'Via_Publica','Calle, carrera, avenida o vía pública',@seed_agency_csj_upper),(6,'Sede_Judicial','Palacio de justicia, juzgado o tribunal',@seed_agency_csj_upper),(7,'Vehiculo_Particular','Automóvil particular como lugar del incidente',@seed_agency_csj_upper),(8,'Restaurante','Establecimiento de comidas',@seed_agency_csj_upper),(9,'Centro_Comercial','Centro comercial',@seed_agency_csj_upper),(10,'Banco','Entidad financiera',@seed_agency_csj_upper);
/*!40000 ALTER TABLE `roles_lugar` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- rolesvehiculo ----
--
-- Dumping data for table `rolesvehiculo`
--

LOCK TABLES `rolesvehiculo` WRITE;
/*!40000 ALTER TABLE `rolesvehiculo` DISABLE KEYS */;
INSERT INTO `rolesvehiculo` VALUES (1,'Implicado','Vehículo involucrado en el incidente',@seed_agency_pol_upper,@seed_pol_created_at),(2,'Afectado','Vehículo con daños',@seed_agency_pol_upper,@seed_pol_created_at),(3,'Testigo','Vehículo que presencia el incidente',@seed_agency_pol_upper,@seed_pol_created_at);
/*!40000 ALTER TABLE `rolesvehiculo` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- rolpersonas ----
--
-- Dumping data for table `rolpersonas`
--

LOCK TABLES `rolpersonas` WRITE;
/*!40000 ALTER TABLE `rolpersonas` DISABLE KEYS */;
INSERT INTO `rolpersonas` VALUES (1,@seed_clasificacion_ordinario,@seed_rolpersona_ordinario_desc,@seed_agency_csj_upper,@seed_rolpersonas_csj_at),(2,@seed_clasificacion_extraordinario,@seed_rolpersona_extraordinario_desc,@seed_agency_csj_upper,@seed_rolpersonas_csj_at),(3,@seed_clasificacion_ordinario,@seed_rolpersona_ordinario_desc,@seed_agency_pol_upper,@seed_rolpersonas_pol_at),(4,@seed_clasificacion_extraordinario,@seed_rolpersona_extraordinario_desc,@seed_agency_pol_upper,@seed_rolpersonas_pol_at);
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
INSERT INTO `tipovehiculo` VALUES (1,'Automóvil','Vehículo particular de 4 ruedas',@seed_agency_pol_upper,@seed_pol_created_at),(2,'Motocicleta','Motocicleta o ciclomotor de 2 ruedas',@seed_agency_pol_upper,@seed_pol_created_at),(3,'Camión','Vehículo de carga pesada',@seed_agency_pol_upper,@seed_pol_created_at),(4,'Bicicleta','Vehículo de tracción humana',@seed_agency_pol_upper,@seed_pol_created_at),(5,'Bus','Transporte público de pasajeros',@seed_agency_pol_upper,@seed_pol_created_at);
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
