CREATE DATABASE IF NOT EXISTS gestionincidentes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE gestionincidentes;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

DROP TABLE IF EXISTS `agencias`;
CREATE TABLE `agencias` (
  `IDAgencias` varchar(5) NOT NULL,
  `Nombre_Agencia` varchar(100) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`IDAgencias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `auditoria_general`;
CREATE TABLE `auditoria_general` (
  `ID_Auditoria` int NOT NULL AUTO_INCREMENT,
  `Tabla_Afectada` varchar(64) DEFAULT NULL,
  `Modulo` varchar(50) DEFAULT NULL,
  `Categoria` varchar(30) NOT NULL DEFAULT 'administracion',
  `Accion` varchar(150) NOT NULL,
  `Resultado` varchar(20) DEFAULT NULL,
  `Detalle` text,
  `ID_Usuario` varchar(100) DEFAULT NULL,
  `Nombre_Usuario` varchar(150) DEFAULT NULL,
  `ID_Agencia` varchar(10) DEFAULT NULL,
  `FechaCambio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Auditoria`),
  KEY `idx_auditoria_usuario_fecha` (`ID_Usuario`,`FechaCambio`),
  KEY `idx_auditoria_categoria` (`Categoria`,`FechaCambio`),
  KEY `idx_auditoria_fecha` (`FechaCambio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `auditoria_incidente`;
CREATE TABLE `auditoria_incidente` (
  `id_transaccion_incidentes` varchar(200) NOT NULL,
  `incidentes_id` int NOT NULL,
  `usuarios_id` varchar(20) DEFAULT NULL,
  `Id_agencia` varchar(5) NOT NULL,
  `accion` varchar(120) NOT NULL,
  `Numero_de_Cambios` varchar(500) DEFAULT NULL,
  `detalles` json DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_transaccion_incidentes`),
  KEY `idx_incidentes_id` (`incidentes_id`),
  KEY `idx_usuarios_id` (`usuarios_id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_agencia` (`Id_agencia`),
  KEY `fk_auditoria_incidente_usuario` (`usuarios_id`,`Id_agencia`),
  CONSTRAINT `auditoria_incidente_ibfk_1` FOREIGN KEY (`incidentes_id`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_auditoria_incidente_usuario` FOREIGN KEY (`usuarios_id`, `Id_agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `comentarios_incidentes`;
CREATE TABLE `comentarios_incidentes` (
  `ID_Comentario` int NOT NULL AUTO_INCREMENT,
  `ID_Incidente` int NOT NULL,
  `Comentario` text NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Comentario`),
  KEY `fk_comentario_incidente` (`ID_Incidente`),
  KEY `fk_comentario_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `fk_comentario_incidente` FOREIGN KEY (`ID_Incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_comentario_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `comentarios_lugar`;
CREATE TABLE `comentarios_lugar` (
  `ID_comentario_lugar` int NOT NULL AUTO_INCREMENT,
  `ID_lugar` int NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Comentario_lugar` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`ID_comentario_lugar`),
  KEY `fk_comentario_lugar_usuario` (`ID_Usuario`,`ID_Agencia`),
  KEY `idx_lugar` (`ID_lugar`),
  KEY `idx_usuario` (`ID_Usuario`),
  KEY `idx_agencia` (`ID_Agencia`),
  KEY `idx_fecha` (`FechaHora`),
  CONSTRAINT `fk_comentario_lugar_lugar` FOREIGN KEY (`ID_lugar`) REFERENCES `lugares` (`ID_lugar`),
  CONSTRAINT `fk_comentario_lugar_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `comentariospersonas`;
CREATE TABLE `comentariospersonas` (
  `ID_transaccion_persona` int NOT NULL AUTO_INCREMENT,
  `ID_persona` int NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Comentarios` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`ID_transaccion_persona`),
  KEY `FK_ComentariosPersonas_Personas` (`ID_persona`),
  KEY `FK_ComentariosPersonas_Usuarios` (`ID_Usuario`),
  KEY `fk_comentariospersonas_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `FK_ComentariosPersonas_Personas` FOREIGN KEY (`ID_persona`) REFERENCES `personas` (`ID_persona`),
  CONSTRAINT `fk_comentariospersonas_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `comentariosvehiculos`;
CREATE TABLE `comentariosvehiculos` (
  `ID_transaccion_vehiculo` int NOT NULL AUTO_INCREMENT,
  `ID_vehiculo` int NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Comentarios` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`ID_transaccion_vehiculo`),
  KEY `FK_ComentariosVehiculos_Vehiculos` (`ID_vehiculo`),
  KEY `FK_ComentariosVehiculos_Usuarios` (`ID_Usuario`),
  KEY `fk_comentariosvehiculos_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `fk_comentariosvehiculos_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `FK_ComentariosVehiculos_Vehiculos` FOREIGN KEY (`ID_vehiculo`) REFERENCES `vehiculos` (`ID_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `comunicacion`;
CREATE TABLE `comunicacion` (
  `ID_comunicacion` int NOT NULL AUTO_INCREMENT,
  `ID_incidente` int NOT NULL,
  `ID_usuario` varchar(50) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Fecha_envio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Destinatario` varchar(150) NOT NULL,
  PRIMARY KEY (`ID_comunicacion`),
  KEY `FK_Comunicacion_Usuarios` (`ID_usuario`),
  KEY `FK_Comunicacion_Destinatario` (`Destinatario`),
  KEY `FK_Comunicacion_Incidentes` (`ID_incidente`),
  KEY `fk_comunicacion_usuario` (`ID_usuario`,`ID_Agencia`),
  CONSTRAINT `FK_Comunicacion_Destinatario` FOREIGN KEY (`Destinatario`) REFERENCES `correosincidentes` (`Correo`),
  CONSTRAINT `FK_Comunicacion_Incidentes` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_comunicacion_usuario` FOREIGN KEY (`ID_usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `contador_incidente_visible`;
CREATE TABLE `contador_incidente_visible` (
  `Anio` int NOT NULL,
  `Ultimo_Numero` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`Anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `correosincidentes`;
CREATE TABLE `correosincidentes` (
  `Correo` varchar(150) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` varchar(20) NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`Correo`,`ID_Agencia`),
  KEY `FK_CorreosIncidentes_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_CorreosIncidentes_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `departamentos`;
CREATE TABLE `departamentos` (
  `id_departamento` int NOT NULL AUTO_INCREMENT,
  `codigo_departamento` char(3) NOT NULL,
  `nombre_departamento` varchar(80) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  PRIMARY KEY (`id_departamento`),
  UNIQUE KEY `uk_departamentos_codigo_agencia` (`codigo_departamento`,`IDAgencias`),
  UNIQUE KEY `uk_departamentos_nombre_agencia` (`nombre_departamento`,`IDAgencias`),
  KEY `idx_departamentos_agencia` (`IDAgencias`),
  CONSTRAINT `departamentos_ibfk_1` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `estadosincidentes`;
CREATE TABLE `estadosincidentes` (
  `ID_estado` int NOT NULL AUTO_INCREMENT,
  `ID_Agencia` varchar(5) NOT NULL,
  `Nombre_estado` varchar(50) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_estado`),
  UNIQUE KEY `UQ_Estado_Agencia` (`Nombre_estado`,`ID_Agencia`),
  KEY `FK_EstadosIncidentes_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_EstadosIncidentes_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `eventos`;
CREATE TABLE `eventos` (
  `ID_evento` int NOT NULL AUTO_INCREMENT,
  `ID_Agencia` varchar(5) NOT NULL,
  `Descripcion` varchar(255) NOT NULL,
  `TipoEvento` varchar(50) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `prioridad_por_defecto` int NOT NULL,
  PRIMARY KEY (`ID_evento`),
  UNIQUE KEY `UQ_Evento_Agencia` (`TipoEvento`,`ID_Agencia`),
  KEY `FK_Eventos_Agencias` (`ID_Agencia`),
  KEY `fk_prioridad_por_defecto` (`prioridad_por_defecto`),
  CONSTRAINT `FK_Eventos_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `fk_prioridad_por_defecto` FOREIGN KEY (`prioridad_por_defecto`) REFERENCES `prioridades` (`ID_prioridad`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `genero`;
CREATE TABLE `genero` (
  `ID_genero` int NOT NULL AUTO_INCREMENT,
  `Descripcion_genero` varchar(80) NOT NULL,
  `Fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_Agencia` varchar(5) NOT NULL,
  PRIMARY KEY (`ID_genero`),
  UNIQUE KEY `uq_genero_descripcion_agencia` (`Descripcion_genero`,`ID_Agencia`),
  KEY `idx_agencia` (`ID_Agencia`),
  KEY `idx_fecha` (`Fecha`),
  CONSTRAINT `fk_genero_agencia` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `catalogo_persona`;
CREATE TABLE `catalogo_persona` (
  `id` varchar(20) NOT NULL,
  `name` varchar(150) DEFAULT NULL,
  `document_id` varchar(30) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `primer_nombre` varchar(50) DEFAULT NULL,
  `segundo_nombre` varchar(50) DEFAULT NULL,
  `primer_apellido` varchar(50) DEFAULT NULL,
  `segundo_apellido` varchar(50) DEFAULT NULL,
  `id_rol_p` int DEFAULT NULL,
  `contacto` varchar(100) DEFAULT NULL,
  `tipo_documento` varchar(20) DEFAULT NULL,
  `numero_documento` varchar(30) DEFAULT NULL,
  `comentarios` varchar(200) DEFAULT NULL,
  `id_genero` int DEFAULT NULL,
  `id_agencia` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_people_phone` (`phone`),
  KEY `idx_people_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `incidentes`;
CREATE TABLE `incidentes` (
  `ID_incidente` int NOT NULL AUTO_INCREMENT,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_evento` int NOT NULL,
  `ID_Origen` int NOT NULL,
  `ANI` varchar(50) DEFAULT NULL,
  `Direccion` varchar(200) DEFAULT NULL,
  `Latitud` double NOT NULL,
  `Longitud` double NOT NULL,
  `ID_persona` int DEFAULT NULL,
  `ID_vehiculo` int DEFAULT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  `ID_visible` varchar(20) DEFAULT NULL,
  `id_departamento` int DEFAULT NULL,
  `id_municipio` int DEFAULT NULL,
  `codigo_oficio_tramite` varchar(50) DEFAULT NULL,
  `destino` varchar(200) DEFAULT NULL,
  `comentario_destino` text,
  `ID_estado` int NOT NULL,
  `Comentario_estado` varchar(200) DEFAULT NULL,
  `ID_prioridad` int NOT NULL,
  `ID_lugar` int DEFAULT NULL,
  PRIMARY KEY (`ID_incidente`),
  UNIQUE KEY `ID_visible` (`ID_visible`),
  KEY `FK_Incidentes_Eventos` (`ID_evento`),
  KEY `FK_Incidentes_Origen` (`ID_Origen`),
  KEY `FK_incidentes_agencias` (`IDAgencias`),
  KEY `FK_Incidentes_Personas` (`ID_persona`),
  KEY `FK_Incidentes_Vehiculos` (`ID_vehiculo`),
  KEY `idx_id_departamento` (`id_departamento`),
  KEY `idx_id_municipio` (`id_municipio`),
  KEY `fk_estado_incidente` (`ID_estado`),
  KEY `idx_lugar` (`ID_lugar`),
  CONSTRAINT `fk_estado_incidente` FOREIGN KEY (`ID_estado`) REFERENCES `estadosincidentes` (`ID_estado`),
  CONSTRAINT `fk_incidente_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON DELETE RESTRICT,
  CONSTRAINT `fk_incidente_lugar` FOREIGN KEY (`ID_lugar`) REFERENCES `lugares` (`ID_lugar`),
  CONSTRAINT `fk_incidente_municipio` FOREIGN KEY (`id_municipio`) REFERENCES `municipios` (`id_municipio`) ON DELETE RESTRICT,
  CONSTRAINT `FK_incidentes_agencias` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `FK_Incidentes_Eventos` FOREIGN KEY (`ID_evento`) REFERENCES `eventos` (`ID_evento`),
  CONSTRAINT `FK_Incidentes_Origen` FOREIGN KEY (`ID_Origen`) REFERENCES `origen` (`ID_Origen`),
  CONSTRAINT `FK_Incidentes_Personas` FOREIGN KEY (`ID_persona`) REFERENCES `personas` (`ID_persona`),
  CONSTRAINT `FK_Incidentes_Vehiculos` FOREIGN KEY (`ID_vehiculo`) REFERENCES `vehiculos` (`ID_vehiculo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `lugares`;
CREATE TABLE `lugares` (
  `ID_lugar` int NOT NULL AUTO_INCREMENT,
  `Nombre_lugar` varchar(100) NOT NULL,
  `Direccion_lugar` varchar(100) NOT NULL,
  `ID_departamento` int DEFAULT NULL,
  `ID_municipio` int DEFAULT NULL,
  `Contacto` varchar(100) DEFAULT NULL,
  `ID_Rol_lugar` int NOT NULL,
  `ID_incidente` int NOT NULL,
  `Fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_lugar`),
  KEY `idx_departamento` (`ID_departamento`),
  KEY `idx_municipio` (`ID_municipio`),
  KEY `idx_rol` (`ID_Rol_lugar`),
  KEY `idx_incidente` (`ID_incidente`),
  KEY `idx_fecha` (`Fecha_registro`),
  CONSTRAINT `fk_lugar_departamento` FOREIGN KEY (`ID_departamento`) REFERENCES `departamentos` (`id_departamento`),
  CONSTRAINT `fk_lugar_incidente` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_lugar_municipio` FOREIGN KEY (`ID_municipio`) REFERENCES `municipios` (`id_municipio`),
  CONSTRAINT `fk_lugar_rol` FOREIGN KEY (`ID_Rol_lugar`) REFERENCES `roles_lugar` (`ID_Rol_Lugar`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `municipios`;
CREATE TABLE `municipios` (
  `id_municipio` int NOT NULL AUTO_INCREMENT,
  `codigo_departamento` char(3) NOT NULL,
  `codigo_municipio` varchar(5) NOT NULL,
  `nombre_municipio` varchar(120) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  PRIMARY KEY (`id_municipio`),
  UNIQUE KEY `uk_municipios_departamento_nombre_agencia` (`codigo_departamento`,`nombre_municipio`,`IDAgencias`),
  UNIQUE KEY `uk_municipios_departamento_codigo_agencia` (`codigo_departamento`,`codigo_municipio`,`IDAgencias`),
  KEY `idx_municipios_departamento` (`codigo_departamento`),
  KEY `idx_municipios_agencia` (`IDAgencias`),
  KEY `idx_codigo_municipio` (`codigo_municipio`),
  CONSTRAINT `municipios_ibfk_1` FOREIGN KEY (`codigo_departamento`) REFERENCES `departamentos` (`codigo_departamento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `municipios_ibfk_2` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `notificaciones_usuarios`;
CREATE TABLE `notificaciones_usuarios` (
  `id_notificaciones` varchar(36) NOT NULL,
  `incidente_id` int DEFAULT NULL,
  `triggered_by` varchar(20) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `fue_leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_visualizacion` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_agencia` varchar(5) NOT NULL,
  `ID_usuario` varchar(20) NOT NULL,
  PRIMARY KEY (`id_notificaciones`),
  KEY `idx_incidente_id` (`incidente_id`),
  KEY `idx_triggered_by` (`triggered_by`),
  KEY `idx_usuario_agencia` (`ID_usuario`,`ID_agencia`),
  KEY `idx_is_read` (`fue_leida`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),
  CONSTRAINT `notificaciones_usuarios_ibfk_1` FOREIGN KEY (`ID_usuario`, `ID_agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `notificaciones_usuarios_ibfk_2` FOREIGN KEY (`incidente_id`) REFERENCES `incidentes` (`ID_incidente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `origen`;
CREATE TABLE `origen` (
  `ID_Origen` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(150) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Origen`),
  UNIQUE KEY `UQ_Origen_Agencia` (`Nombre`,`ID_Agencia`),
  KEY `FK_Origen_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_Origen_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pasosprotocolo`;
CREATE TABLE `pasosprotocolo` (
  `ID_Paso` int NOT NULL AUTO_INCREMENT,
  `ID_Protocolo` int NOT NULL,
  `NumeroPaso` int NOT NULL,
  `Descripcion` varchar(200) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Paso`),
  UNIQUE KEY `UQ_Protocolo_Paso` (`ID_Protocolo`,`NumeroPaso`),
  CONSTRAINT `FK_PasosProtocolo_Protocolos` FOREIGN KEY (`ID_Protocolo`) REFERENCES `protocolos` (`ID_Protocolo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `permisos`;
CREATE TABLE `permisos` (
  `ID_permiso` int NOT NULL AUTO_INCREMENT,
  `Nombre_permiso` varchar(50) NOT NULL,
  `Descripcion_permiso` varchar(100) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_permiso`),
  UNIQUE KEY `UQ_Permiso` (`Nombre_permiso`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `permisos_de_rol`;
CREATE TABLE `permisos_de_rol` (
  `id_permiso` int NOT NULL AUTO_INCREMENT,
  `id_rol` varchar(20) NOT NULL,
  `id_agencia` varchar(5) NOT NULL,
  `id_modulo` int NOT NULL,
  `habilitado` tinyint(1) NOT NULL DEFAULT '0',
  `puede_ver` tinyint(1) NOT NULL DEFAULT '0',
  `puede_verIncidente` tinyint(1) NOT NULL DEFAULT '0',
  `puede_crear` tinyint(1) NOT NULL DEFAULT '0',
  `puede_editar` tinyint(1) NOT NULL DEFAULT '0',
  `puede_notificar` tinyint(1) NOT NULL DEFAULT '0',
  `puede_exportar` tinyint(1) NOT NULL DEFAULT '0',
  `req_habilitado` tinyint(1) NOT NULL DEFAULT '0',
  `req_puede_ver` tinyint(1) NOT NULL DEFAULT '0',
  `req_puede_verIncidente` tinyint(1) NOT NULL DEFAULT '0',
  `req_puede_crear` tinyint(1) NOT NULL DEFAULT '0',
  `req_puede_editar` tinyint(1) NOT NULL DEFAULT '0',
  `req_puede_notificar` tinyint(1) NOT NULL DEFAULT '0',
  `req_puede_exportar` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_permiso`),
  KEY `idx_rol` (`id_rol`),
  KEY `idx_agencia` (`id_agencia`),
  KEY `idx_module` (`id_modulo`),
  KEY `idx_rol_agencia` (`id_rol`,`id_agencia`),
  KEY `idx_enabled` (`habilitado`),
  CONSTRAINT `fk_permiso_agencia` FOREIGN KEY (`id_agencia`) REFERENCES `agencias` (`IDAgencias`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_permiso_module` FOREIGN KEY (`id_modulo`) REFERENCES `modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_permiso_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`ID_Rol`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `personas`;
CREATE TABLE `personas` (
  `ID_persona` int NOT NULL AUTO_INCREMENT,
  `Primer_Nombre` varchar(50) NOT NULL,
  `Segundo_Nombre` varchar(50) DEFAULT NULL,
  `Primer_Apellido` varchar(50) NOT NULL,
  `Segundo_Apellido` varchar(50) DEFAULT NULL,
  `ID_RolP` int NOT NULL,
  `ID_Cargo` int DEFAULT NULL,
  `Contacto` varchar(100) DEFAULT NULL,
  `Tipo_documento` varchar(20) DEFAULT NULL,
  `Numero_documento` varchar(30) DEFAULT NULL,
  `Comentarios` varchar(500) DEFAULT NULL,
  `ID_incidente` int DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_Agencia` varchar(5) DEFAULT NULL,
  `ID_Usuario` varchar(20) DEFAULT NULL,
  `ID_genero` int DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`ID_persona`),
  KEY `FK_Personas_Rolpersonas` (`ID_RolP`),
  KEY `FK_Personas_TipoDocumentos` (`Tipo_documento`),
  KEY `fk_registro_ID_agencia` (`ID_Usuario`,`ID_Agencia`),
  KEY `fk_registro_personas_incidente` (`ID_incidente`),
  KEY `idx_genero` (`ID_genero`),
  KEY `FK_Personas_CargosJuez` (`ID_Cargo`),
  CONSTRAINT `fk_persona_genero` FOREIGN KEY (`ID_genero`) REFERENCES `genero` (`ID_genero`),
  CONSTRAINT `FK_Personas_CargosJuez` FOREIGN KEY (`ID_Cargo`) REFERENCES `cargos_juez` (`ID_Cargo`),
  CONSTRAINT `FK_Personas_Rolpersonas` FOREIGN KEY (`ID_RolP`) REFERENCES `rolpersonas` (`ID_RolP`),
  CONSTRAINT `FK_Personas_TipoDocumentos` FOREIGN KEY (`Tipo_documento`) REFERENCES `tipodocumentos` (`Tipo_documento`),
  CONSTRAINT `fk_registro_ID_agencia` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `fk_registro_personas_incidente` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `prioridades`;
CREATE TABLE `prioridades` (
  `ID_prioridad` int NOT NULL AUTO_INCREMENT,
  `Prioridad` varchar(50) NOT NULL,
  `Descripcion` varchar(150) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_prioridad`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `protocolos`;
CREATE TABLE `protocolos` (
  `ID_Protocolo` int NOT NULL AUTO_INCREMENT,
  `Protocolo` varchar(50) NOT NULL,
  `ID_evento` int NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Descripcion` varchar(200) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Protocolo`),
  UNIQUE KEY `UQ_Protocolo_Agencia` (`Protocolo`,`ID_Agencia`),
  KEY `FK_Protocolos_Agencias` (`ID_Agencia`),
  KEY `FK_Protocolos_Eventos` (`ID_evento`),
  CONSTRAINT `FK_Protocolos_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `FK_Protocolos_Eventos` FOREIGN KEY (`ID_evento`) REFERENCES `eventos` (`ID_evento`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `registro_logueos`;
CREATE TABLE `registro_logueos` (
  `ID_registro` int NOT NULL AUTO_INCREMENT,
  `Accion` varchar(50) NOT NULL,
  `Descripcion_accion` varchar(200) DEFAULT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `ID_Rol` varchar(20) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  `Recordar_usuario` enum('Si','No') NOT NULL DEFAULT 'No',
  `Fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Login_exitoso` enum('Exitoso','Fallido','Pendiente') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`ID_registro`),
  KEY `idx_usuario` (`ID_Usuario`),
  KEY `idx_fecha` (`Fecha`),
  KEY `idx_login_exitoso` (`Login_exitoso`),
  KEY `idx_accion` (`Accion`),
  KEY `idx_agencia` (`IDAgencias`),
  KEY `fk_registro_logueos_usuario` (`ID_Usuario`,`ID_Agencia`),
  KEY `registro_logueos_ibfk_2` (`ID_Rol`),
  CONSTRAINT `fk_registro_logueos_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `registro_logueos_ibfk_2` FOREIGN KEY (`ID_Rol`) REFERENCES `roles` (`ID_Rol`),
  CONSTRAINT `registro_logueos_ibfk_3` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `registrodobleautentificacion`;
CREATE TABLE `registrodobleautentificacion` (
  `ID_accion` int NOT NULL AUTO_INCREMENT,
  `accion` varchar(200) NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  `Fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Correo` varchar(100) NOT NULL,
  `ID_Registro` int NOT NULL,
  PRIMARY KEY (`ID_accion`),
  KEY `idx_usuario` (`ID_Usuario`),
  KEY `idx_agencia` (`IDAgencias`),
  KEY `idx_fecha` (`Fecha`),
  KEY `idx_correo` (`Correo`),
  KEY `idx_registro` (`ID_Registro`),
  KEY `fk_registro_2fa_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `fk_registro_2fa_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `registrodobleautentificacion_ibfk_2` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT,
  CONSTRAINT `registrodobleautentificacion_ibfk_3` FOREIGN KEY (`ID_Registro`) REFERENCES `registro_logueos` (`ID_registro`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `riesgos`;
CREATE TABLE `riesgos` (
  `ID_riesgo` int NOT NULL AUTO_INCREMENT,
  `Nombre_riesgo` varchar(50) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_riesgo`),
  UNIQUE KEY `unique_riesgo_por_agencia` (`ID_Agencia`,`Nombre_riesgo`),
  CONSTRAINT `riesgos_ibfk_1` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `ID_Rol` varchar(20) NOT NULL,
  `Rol` varchar(50) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `es_protegido` tinyint(1) NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Rol`),
  UNIQUE KEY `uq_rol_agencia` (`Rol`,`ID_Agencia`),
  KEY `FK_Roles_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_Roles_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `roles_lugar`;
CREATE TABLE `roles_lugar` (
  `ID_Rol_Lugar` int NOT NULL AUTO_INCREMENT,
  `Rol_lugar` varchar(50) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Fecha_Creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Rol_Lugar`),
  UNIQUE KEY `uq_rol_lugar_agencia` (`Rol_lugar`,`ID_Agencia`),
  KEY `fk_rol_lugar_agencia` (`ID_Agencia`),
  CONSTRAINT `fk_rol_lugar_agencia` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `rolesvehiculo`;
CREATE TABLE `rolesvehiculo` (
  `ID_RolVehiculo` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(100) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_RolVehiculo`),
  UNIQUE KEY `UQ_RolVehiculo_Agencia` (`Nombre`,`ID_Agencia`),
  KEY `FK_RolesVehiculo_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_RolesVehiculo_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `rolpersonas`;
CREATE TABLE `rolpersonas` (
  `ID_RolP` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(100) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_RolP`),
  UNIQUE KEY `UQ_ID_RolP_Agencia` (`Nombre`,`ID_Agencia`),
  KEY `FK_rolpersonas_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_rolpersonas_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tipodocumentos`;
CREATE TABLE `tipodocumentos` (
  `Tipo_documento` varchar(20) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Tipo_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tipovehiculo`;
CREATE TABLE `tipovehiculo` (
  `ID_TipoVehi` int NOT NULL AUTO_INCREMENT,
  `Tipo_vehiculo` varchar(50) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_TipoVehi`),
  UNIQUE KEY `UQ_TipoVehiculo_Agencia` (`Tipo_vehiculo`,`ID_Agencia`),
  KEY `FK_TipoVehiculo_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_TipoVehiculo_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ubicacion`;
CREATE TABLE `ubicacion` (
  `ID_solicitud` int NOT NULL AUTO_INCREMENT,
  `FechaHora_envio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Numero_ubicacion` varchar(20) NOT NULL,
  `Canal` varchar(20) NOT NULL,
  `ID_incidente` int DEFAULT NULL,
  `url_peticion` varchar(500) NOT NULL,
  `ID_usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `long` double DEFAULT NULL,
  `FechaHora_recibido` datetime DEFAULT NULL,
  PRIMARY KEY (`ID_solicitud`),
  KEY `FK_Ubicacion_Incidentes` (`ID_incidente`),
  KEY `fk_ubicacion_usuario` (`ID_usuario`,`ID_Agencia`),
  CONSTRAINT `FK_Ubicacion_Incidentes` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_ubicacion_usuario` FOREIGN KEY (`ID_usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `ubicacion_chk_1` CHECK ((`Canal` in (_utf8mb4'Whatsapp',_utf8mb4'SMS')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `ID_Usuario` varchar(20) NOT NULL,
  `Primer_Nombre` varchar(50) NOT NULL,
  `Segundo_Nombre` varchar(50) DEFAULT NULL,
  `Primer_Apellido` varchar(50) NOT NULL,
  `Segundo_Apellido` varchar(50) DEFAULT NULL,
  `ID_Rol` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Correo` varchar(100) NOT NULL,
  `Telefono` varchar(20) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Contraseña` varchar(100) NOT NULL,
  `estado` varchar(20) DEFAULT NULL,
  `Token_Contraseña` varchar(300) NOT NULL,
  PRIMARY KEY (`ID_Usuario`,`ID_Agencia`),
  UNIQUE KEY `uk_usuarios_correo_agencia` (`Correo`,`ID_Agencia`),
  KEY `FK_Usuarios_Roles` (`ID_Rol`),
  KEY `FK_Usuarios_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_Usuarios_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `FK_Usuarios_Roles` FOREIGN KEY (`ID_Rol`) REFERENCES `roles` (`ID_Rol`),
  CONSTRAINT `chk_estado` CHECK ((`estado` in (_utf8mb4'Activo',_utf8mb4'Inactivo')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `vehiculos`;
CREATE TABLE `vehiculos` (
  `ID_vehiculo` int NOT NULL AUTO_INCREMENT,
  `ID_RolV` int NOT NULL,
  `ID_TipoVehi` int NOT NULL,
  `Placa` varchar(20) DEFAULT NULL,
  `Color` varchar(30) DEFAULT NULL,
  `Marca` varchar(50) DEFAULT NULL,
  `Modelo_linea` varchar(50) DEFAULT NULL,
  `ID_incidente` int NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_Agencia` varchar(5) DEFAULT NULL,
  `ID_Usuario` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`ID_vehiculo`),
  KEY `FK_Vehiculos_RolesVehiculo` (`ID_RolV`),
  KEY `FK_Vehiculos_TipoVehiculo` (`ID_TipoVehi`),
  KEY `fk_registro_ID_agencia_vehiculo` (`ID_Usuario`,`ID_Agencia`),
  KEY `fk_registro_vehiculos_incidente` (`ID_incidente`),
  CONSTRAINT `fk_registro_ID_agencia_vehiculo` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `fk_registro_vehiculos_incidente` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `FK_Vehiculos_RolesVehiculo` FOREIGN KEY (`ID_RolV`) REFERENCES `rolesvehiculo` (`ID_RolVehiculo`),
  CONSTRAINT `FK_Vehiculos_TipoVehiculo` FOREIGN KEY (`ID_TipoVehi`) REFERENCES `tipovehiculo` (`ID_TipoVehi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cargos_juez`;
CREATE TABLE `cargos_juez` (
  `ID_Cargo` int NOT NULL AUTO_INCREMENT,
  `Cargo` varchar(255) NOT NULL,
  `Descripcion` text,
  `ID_Agencia` varchar(10) NOT NULL,
  `ID_RolP` int NOT NULL,
  `FechaRegistro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Cargo`),
  KEY `FK_CargosJuez_RolPersonas` (`ID_RolP`),
  CONSTRAINT `FK_CargosJuez_RolPersonas` FOREIGN KEY (`ID_RolP`) REFERENCES `rolpersonas` (`ID_RolP`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tipos_medida_seguridad`;
CREATE TABLE `tipos_medida_seguridad` (
  `ID_tipo_medida` int NOT NULL AUTO_INCREMENT,
  `Nombre_medida` varchar(80) NOT NULL,
  `Descripcion` varchar(200) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Activo` tinyint(1) NOT NULL DEFAULT '1',
  `Fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_tipo_medida`),
  UNIQUE KEY `uq_medida_agencia` (`Nombre_medida`,`ID_Agencia`),
  KEY `fk_tms_agencia` (`ID_Agencia`),
  CONSTRAINT `fk_tms_agencia` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gestion_medidas`;
CREATE TABLE `gestion_medidas` (
  `ID_gestion` int NOT NULL AUTO_INCREMENT,
  `ID_incidente` int NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `servidor_judicial` varchar(150) DEFAULT NULL,
  `cedula` varchar(20) DEFAULT NULL,
  `cargo` varchar(100) DEFAULT NULL,
  `codigo_oficio` varchar(50) DEFAULT NULL,
  `tramite_destino` varchar(200) DEFAULT NULL,
  `fecha_cerrem` date DEFAULT NULL,
  `resolucion_cerrem` varchar(100) DEFAULT NULL,
  `fecha_resolucion` date DEFAULT NULL,
  `ID_riesgo` int DEFAULT NULL,
  `tipo_esquema` enum('Individual','Colectivo') DEFAULT NULL,
  `compartido_con` varchar(200) DEFAULT NULL,
  `observaciones` text,
  `ID_usuario_registro` varchar(20) NOT NULL,
  `Fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_gestion`),
  UNIQUE KEY `uq_gestion_incidente` (`ID_incidente`),
  KEY `fk_gm_agencia` (`ID_Agencia`),
  KEY `fk_gm_riesgo` (`ID_riesgo`),
  KEY `fk_gm_usuario` (`ID_usuario_registro`,`ID_Agencia`),
  CONSTRAINT `fk_gm_agencia` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `fk_gm_incidente` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`) ON DELETE CASCADE,
  CONSTRAINT `fk_gm_riesgo` FOREIGN KEY (`ID_riesgo`) REFERENCES `riesgos` (`ID_riesgo`),
  CONSTRAINT `fk_gm_usuario` FOREIGN KEY (`ID_usuario_registro`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `incidente_medidas`;
CREATE TABLE `incidente_medidas` (
  `ID_incidente_medida` int NOT NULL AUTO_INCREMENT,
  `ID_gestion` int NOT NULL,
  `ID_tipo_medida` int NOT NULL,
  `asignado` tinyint(1) NOT NULL DEFAULT '1',
  `cantidad` int DEFAULT '1',
  `observacion_medida` varchar(300) DEFAULT NULL,
  `fecha_asignacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_retiro` datetime DEFAULT NULL,
  `ID_usuario_asigna` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  PRIMARY KEY (`ID_incidente_medida`),
  UNIQUE KEY `uq_medida_por_gestion` (`ID_gestion`,`ID_tipo_medida`),
  KEY `fk_im_tipo_medida` (`ID_tipo_medida`),
  KEY `fk_im_usuario` (`ID_usuario_asigna`,`ID_Agencia`),
  CONSTRAINT `fk_im_gestion` FOREIGN KEY (`ID_gestion`) REFERENCES `gestion_medidas` (`ID_gestion`) ON DELETE CASCADE,
  CONSTRAINT `fk_im_tipo_medida` FOREIGN KEY (`ID_tipo_medida`) REFERENCES `tipos_medida_seguridad` (`ID_tipo_medida`),
  CONSTRAINT `fk_im_usuario` FOREIGN KEY (`ID_usuario_asigna`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
